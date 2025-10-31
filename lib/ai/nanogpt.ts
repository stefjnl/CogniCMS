import { buildTraceLogger } from "@/lib/utils/trace";

export interface ChatMessage {
  id?: string;
  role: "system" | "user" | "assistant";
  content: string;
}

export interface NanoGptResponseMeta {
  status: number;
  headers: Record<string, string>;
}

const API_URL = "https://nano-gpt.com/api/v1/chat/completions";

function getApiKey(): string {
  const key = process.env.NANOGPT_API_KEY;
  if (!key) {
    throw new Error("NANOGPT_API_KEY is not configured");
  }
  return key;
}

export async function createNanoGptRequest(
  messages: ChatMessage[],
  traceId: string,
  signal?: AbortSignal
): Promise<Response> {
  const logger = buildTraceLogger("NanoGPT", traceId);
  logger("request", { messageCount: messages.length });

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      "X-Trace-Id": traceId,
    },
    body: JSON.stringify({
      model: "z-ai/glm-4.6",
      stream: true,
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
    signal,
  });

  if (!response.ok && response.body) {
    logger("error", { status: response.status });
  }

  return response;
}
