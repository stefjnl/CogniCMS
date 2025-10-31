import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { executeChat } from "@/lib/ai/assistant";
import type { ChatRequestBody } from "@/lib/ai/assistant";
import { requireSession } from "@/lib/utils/auth";
import { chatMessageSchema } from "@/lib/utils/validation";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await context.params;
  try {
    await requireSession();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const traceId = request.headers.get("x-trace-id") ?? randomUUID();
  const conversationId = randomUUID();
  const messageId = randomUUID();

  const raw = await request.json();
  const parsed = chatMessageSchema.parse(raw) as ChatRequestBody;

  const result = await executeChat(parsed, {
    siteId,
    traceId,
    conversationId,
    messageId,
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Trace-Id": traceId,
    },
    originalMessages: parsed.messages ?? [],
  });
}
