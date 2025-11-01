import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { executeChat } from "@/lib/ai/assistant";
import type { ChatRequestBody } from "@/lib/ai/assistant";
import { requireSession } from "@/lib/utils/auth";
import { chatMessageSchema } from "@/lib/utils/validation";
import { withRateLimit, addRateLimitHeaders } from "@/lib/utils/ratelimit";

// Note: Uses Node.js runtime due to crypto.randomUUID and file-based storage
// To enable Edge Runtime: migrate to database storage and use Web Crypto API
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await context.params;

  // Get session first to extract tier for rate limiting
  let session;
  try {
    session = await requireSession();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limiting: Tier-based limits for chat (AI operations are expensive)
  // Free: 10/min, Pro: 50/min, Enterprise: 200/min
  const rateLimitResult = await withRateLimit(request, {
    type: "chat",
    tier: session.tier,
  });
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
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

  const response = result.toUIMessageStreamResponse({
    headers: {
      "X-Trace-Id": traceId,
      // Add rate limit headers to streaming response
      "X-RateLimit-Limit": rateLimitResult.result.limit.toString(),
      "X-RateLimit-Remaining": rateLimitResult.result.remaining.toString(),
      "X-RateLimit-Reset": rateLimitResult.result.reset.toString(),
    },
    originalMessages: parsed.messages ?? [],
  });

  return response;
}
