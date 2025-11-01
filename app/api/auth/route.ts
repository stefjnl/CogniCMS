import { NextRequest, NextResponse } from "next/server";
import {
  createSessionResponse,
  destroySessionResponse,
  verifyPassword,
} from "@/lib/utils/auth";
import { withRateLimit } from "@/lib/utils/ratelimit";

// Use Edge Runtime for faster cold starts and lower latency
export const runtime = "edge";

export async function POST(request: NextRequest) {
  // Rate limiting: Use default (60 requests/minute) to prevent brute force attacks
  const rateLimitResult = await withRateLimit(request, { type: "default" });
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  const body = await request.json();
  const password = body?.password;
  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "Password is required" },
      { status: 400 }
    );
  }

  const valid = verifyPassword(password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  return createSessionResponse();
}

export function DELETE() {
  return destroySessionResponse();
}
