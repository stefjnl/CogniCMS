import { NextRequest, NextResponse } from "next/server";
import {
  createSessionResponse,
  destroySessionResponse,
  verifyPassword,
} from "@/lib/utils/auth";

export async function POST(request: NextRequest) {
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
