import { buildSystemPrompt } from "@/lib/ai/prompts";
import {
    applyToolActions,
    toolPlanSchema,
    type ToolAction,
} from "@/lib/ai/tools";
import { config } from "@/lib/config";
import { getFileContent } from "@/lib/github/operations";
import { setDraftContent } from "@/lib/storage/cache";
import { getSiteConfig } from "@/lib/storage/sites";
import { buildTraceLogger } from "@/lib/utils/trace";
import { WebsiteContent } from "@/types/content";
import { SiteConfig } from "@/types/site";
import { createOpenAI } from "@ai-sdk/openai";
import {
    convertToModelMessages,
    stepCountIs,
    streamText,
    type UIMessage,
} from "ai";
import { z } from "zod";

export interface ChatRequestBody {
  id?: string;
  messages?: UIMessage[];
  data?: unknown;
  [key: string]: unknown;
}

export interface ChatExecutionContext {
  siteId: string;
  traceId: string;
  conversationId: string;
  messageId: string;
  systemContext?: string;
}

async function loadSiteContent(
  siteId: string
): Promise<{ site: SiteConfig; content: WebsiteContent }> {
  const site = await getSiteConfig(siteId);
  if (!site) {
    throw new Error("Site configuration not found");
  }

  const file = await getFileContent(site, site.contentFile);
  const parsed = JSON.parse(file.content) as WebsiteContent;
  return { site, content: parsed };
}

type PlanInput = z.infer<typeof toolPlanSchema>;

const nanoGptModel = (() => {
  const apiKey = process.env.NANOGPT_API_KEY;
  if (!apiKey) {
    throw new Error("NANOGPT_API_KEY is not configured");
  }
  const baseURL = process.env.NANOGPT_BASE_URL ?? "https://nano-gpt.com/api/v1";
  const provider = createOpenAI({
    apiKey,
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
  });
  // Prefer centralized server config, then environment variable. Explicit configuration is required.
  const modelId = config.ai?.nanoGpt?.model ?? process.env.NANOGPT_MODEL;
  if (!modelId) {
    throw new Error(
      "NANOGPT_MODEL is not configured. Please set NANOGPT_MODEL (server) and NEXT_PUBLIC_NANOGPT_MODEL (client) as needed."
    );
  }
  return provider.chat(modelId);
})();

export async function executeChat(
  body: ChatRequestBody,
  context: ChatExecutionContext
) {
  const { site, content } = await loadSiteContent(context.siteId);
  const systemPrompt = buildSystemPrompt(site, content, context.systemContext);

  const logger = buildTraceLogger("ChatExecutor", context.traceId);
  let workingDraft = structuredClone(content);

  const planTool = {
    description:
      "Apply structured updates to the site's content model. Always include the concrete actions that reflect the user request.",
    inputSchema: toolPlanSchema,
    execute: async (input: unknown) => {
      const payload = toolPlanSchema.parse(input as PlanInput);
      const typedActions = payload.actions as unknown as ToolAction[];
      const { content: nextContent, changes } = applyToolActions(
        workingDraft,
        typedActions
      );
      workingDraft = nextContent;
      setDraftContent(context.siteId, nextContent, {
        traceId: context.traceId,
        source: "chat-executor",
      });
      logger("draft-updated", {
        actionCount: typedActions.length,
        changeCount: changes.length,
      });
      return {
        status: "draft-updated",
        changeCount: changes.length,
      };
    },
  } as const;

  return streamText({
    model: nanoGptModel,
    system: systemPrompt,
    messages: convertToModelMessages(body.messages ?? []),
    headers: {
      "X-Trace-Id": context.traceId,
    },
    tools: {
      applyUpdates: planTool as any,
    },
    // Enable multi-step tool execution: allows model to call tools,
    // receive results, and continue generating or calling more tools
    // up to 5 steps. This enables complex multi-operation workflows
    // in a single request without requiring manual round trips.
    stopWhen: stepCountIs(5),
    onStepFinish: async ({ toolResults }) => {
      logger("step-complete", {
        toolCount: toolResults?.length || 0,
        hasToolResults: toolResults && toolResults.length > 0,
      });
    },
    onFinish: async ({ steps, text }) => {
      const toolCallCount = steps.flatMap((step) => step.toolCalls).length;
      const lastUserMessage = body.messages?.[body.messages.length - 1];
      
      // Extract text content from message parts
      const getMessageContent = (msg: UIMessage | undefined) => {
        if (!msg || msg.role !== "user") return null;
        if (!msg.parts || msg.parts.length === 0) return null;
        
        return msg.parts
          .map((part: any) => {
            if (part.type === "text" && typeof part.text === "string") {
              return part.text;
            }
            return "";
          })
          .filter(Boolean)
          .join(" ");
      };

      logger("response-complete", {
        totalSteps: steps.length,
        toolCallCount,
        hasToolCalls: toolCallCount > 0,
        hasTextOnly: text && toolCallCount === 0,
        lastUserMessageContent: getMessageContent(lastUserMessage),
        systemContextPresent: !!context.systemContext,
      });

      // Debug log for clarification issue
      if (toolCallCount === 0 && text) {
        logger("warning-no-tool-calls", {
          message: "AI responded with text only, no tool calls",
          responseTextPreview: text.substring(0, 200),
          lastUserMessage: getMessageContent(lastUserMessage),
        });
      }
    },
    onError: async ({ error }) => {
      logger("error", { error: (error as Error).message });
    },
  });
}
