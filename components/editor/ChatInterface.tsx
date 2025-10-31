"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { SiteConfig } from "@/types/site";
import { WebsiteContent, PreviewChange } from "@/types/content";
import { MessageList } from "@/components/editor/MessageList";
import { MessageInput } from "@/components/editor/MessageInput";
import { PreviewPanel } from "@/components/editor/PreviewPanel";
import { ContentOverview } from "@/components/editor/ContentOverview";
import { SiteHeader } from "@/components/editor/SiteHeader";
import { ApprovalButtons } from "@/components/editor/ApprovalButtons";
import { PublishingStatus } from "@/components/editor/PublishingStatus";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { diffWebsiteContent } from "@/lib/content/differ";
import { buildCommitMessage } from "@/lib/utils/commit";

interface ChatInterfaceProps {
  site: SiteConfig;
  initialContent: WebsiteContent;
  lastModified: string;
}

function parseJsonPlan(
  content: string
): { explanation: string; actions: unknown[] } | null {
  try {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return null;
    }
    const parsed = JSON.parse(content.slice(start, end + 1));
    return {
      explanation: parsed.explanation ?? content,
      actions: parsed.actions ?? [],
    };
  } catch {
    return null;
  }
}

export function ChatInterface({
  site,
  initialContent,
  lastModified,
}: ChatInterfaceProps) {
  const [draftContent, setDraftContent] = useState<WebsiteContent | null>(
    initialContent
  );
  const [previewChanges, setPreviewChanges] = useState<PreviewChange[]>([]);
  const [commitMessage, setCommitMessage] = useState(
    "[CogniCMS] Content update"
  );
  const [publishState, setPublishState] = useState<
    "idle" | "pending" | "publishing" | "published" | "error"
  >("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [lastAppliedAssistantId, setLastAppliedAssistantId] = useState<
    string | null
  >(null);
  const baselineRef = useRef<WebsiteContent>(initialContent);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat/${site.id}`,
      }),
    [site.id]
  );

  const {
    messages: uiMessages,
    sendMessage,
    status: chatStatus,
    error: chatError,
    clearError,
  } = useChat({
    transport,
  });

  useEffect(() => {
    if (chatError) {
      setClientError(chatError.message);
    }
  }, [chatError]);

  const isChatStreaming =
    chatStatus === "submitted" || chatStatus === "streaming";

  const diffAgainstBaseline = useCallback(
    (nextContent: WebsiteContent) =>
      diffWebsiteContent(baselineRef.current, nextContent),
    []
  );

  const refreshDraft = useCallback(
    async (payloadExplanation?: string) => {
      const response = await fetch(`/api/content/${site.id}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to refresh content draft");
      }
      const body = await response.json();
      const nextContent = body.content as WebsiteContent;
      setDraftContent(nextContent);
      const changes = diffAgainstBaseline(nextContent);
      setPreviewChanges(changes);
      const nextCommit = buildCommitMessage(changes);
      setCommitMessage(nextCommit);
      if (payloadExplanation) {
        setStatusMessage(payloadExplanation);
      }
      if (changes.length > 0) {
        setPublishState("pending");
      }
    },
    [diffAgainstBaseline, site.id]
  );

  const handleSend = useCallback(
    async (message: string) => {
      try {
        setClientError(null);
        setStatusMessage(null);
        setPublishState("idle");
        clearError?.();
        await sendMessage(
          { text: message },
          {
            headers: {
              "X-Trace-Id": crypto.randomUUID(),
            },
          }
        );
      } catch (err) {
        setClientError((err as Error).message);
      }
    },
    [clearError, sendMessage]
  );

  const handleReset = useCallback(async () => {
    setDraftContent(baselineRef.current);
    setPreviewChanges([]);
    setCommitMessage("[CogniCMS] Content update");
    setPublishState("idle");
    await fetch(`/api/content/${site.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baselineRef.current),
    });
  }, [site.id]);

  const handlePublish = useCallback(async () => {
    if (!draftContent) return;
    setPublishState("publishing");
    setClientError(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/publish/${site.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draftContent,
          commitMessage,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to publish changes");
      }

      baselineRef.current = draftContent;
      setPreviewChanges([]);
      setPublishState("published");
      setStatusMessage(payload.message ?? "Changes published successfully.");

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setPublishState("idle");
        setStatusMessage(null);
      }, 5000);
    } catch (err) {
      setClientError((err as Error).message);
      setPublishState("error");
    }
  }, [commitMessage, draftContent, site.id]);

  const disablePublish = useMemo(
    () =>
      publishState === "publishing" ||
      isChatStreaming ||
      previewChanges.length === 0,
    [publishState, isChatStreaming, previewChanges.length]
  );

  useEffect(() => {
    if (chatStatus !== "ready") {
      return;
    }

    const assistantMessages = uiMessages.filter(
      (message) => message.role === "assistant"
    );
    if (assistantMessages.length === 0) {
      return;
    }

    const latestAssistant = assistantMessages[assistantMessages.length - 1];
    if (!latestAssistant || latestAssistant.id === lastAppliedAssistantId) {
      return;
    }

    const explanationSource = extractAssistantSummary(latestAssistant).trim();
    if (!explanationSource) {
      return;
    }

    const plan = parseJsonPlan(explanationSource);
    const explanation = plan?.explanation ?? explanationSource;

    refreshDraft(explanation)
      .then(() => {
        setLastAppliedAssistantId(latestAssistant.id);
      })
      .catch((err) => {
        setClientError((err as Error).message);
      });
  }, [chatStatus, lastAppliedAssistantId, refreshDraft, uiMessages]);

  const visibleMessages = useMemo(
    () =>
      uiMessages.filter(
        (message) => message.role === "user" || message.role === "assistant"
      ),
    [uiMessages]
  );

  const showSpinner = isChatStreaming;

  return (
    <div className="space-y-6">
      <SiteHeader site={site} lastSynced={lastModified} />

      {/* Two-column layout: 40% chat, 60% preview on desktop; stacked on mobile */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[2fr,3fr]">
        {/* Left Column: Chat Panel */}
        <div className="flex flex-col space-y-4">
          <div
            className="h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:h-auto"
            style={{ maxHeight: "calc(100vh - 20rem)" }}
          >
            <MessageList
              messages={visibleMessages}
              changes={previewChanges}
              lastAssistantMessageId={lastAppliedAssistantId}
            />
          </div>

          <MessageInput
            onSend={handleSend}
            disabled={isChatStreaming || publishState === "publishing"}
          />

          {showSpinner && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <LoadingSpinner />
              <span>AI is thinking...</span>
            </div>
          )}

          {clientError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{clientError}</p>
            </div>
          )}
        </div>

        {/* Right Column: Preview Panel */}
        <div className="space-y-4">
          <ContentOverview content={draftContent} />

          <PreviewPanel draftContent={draftContent} changes={previewChanges} />

          <PublishingStatus
            state={publishState}
            changeCount={previewChanges.length}
            message={statusMessage || undefined}
            onPublish={handlePublish}
            onViewLive={() =>
              window.open(
                `https://${site.githubOwner}.github.io/${site.githubRepo}/`,
                "_blank"
              )
            }
          />

          <ApprovalButtons
            onPublish={handlePublish}
            onReset={handleReset}
            disabled={disablePublish}
            changeCount={previewChanges.length}
          />
        </div>
      </div>
    </div>
  );
}

function formatToolSummary(output: unknown): string {
  if (!output) {
    return "";
  }

  if (typeof output === "string") {
    return output;
  }

  if (typeof output === "object") {
    const typed = output as { type?: string; value?: unknown };
    if (typeof typed.type === "string") {
      switch (typed.type) {
        case "text":
        case "error-text":
          return typeof typed.value === "string" ? typed.value : "";
        case "json":
        case "error-json":
          return JSON.stringify(typed.value, null, 2);
      }
    }
    return JSON.stringify(output, null, 2);
  }

  return String(output);
}

function extractAssistantSummary(message: UIMessage): string {
  const rawContent = (message as { content?: unknown }).content;

  if (typeof rawContent === "string" && rawContent.trim().length > 0) {
    return rawContent;
  }

  if (Array.isArray(rawContent)) {
    return rawContent
      .map((entry: unknown) =>
        typeof entry === "string" ? entry : JSON.stringify(entry, null, 2)
      )
      .join("\n\n");
  }

  if (!message.parts || message.parts.length === 0) {
    return "";
  }

  const segments = message.parts
    .map((part) => {
      const anyPart = part as Record<string, unknown> & { type?: string };

      if (typeof anyPart.type === "string") {
        switch (anyPart.type) {
          case "text":
          case "reasoning":
            return typeof anyPart.text === "string" ? anyPart.text : "";
          case "tool-call":
            return typeof anyPart.toolName === "string"
              ? `Calling ${anyPart.toolName}...`
              : "";
          case "tool-result":
            return formatToolSummary(anyPart.output);
          default:
            break;
        }
      }

      if (typeof anyPart.text === "string") {
        return anyPart.text;
      }

      if (typeof anyPart.output === "string") {
        return anyPart.output;
      }

      return "";
    })
    .filter((segment) => segment.length > 0);

  return segments.join("\n\n");
}
