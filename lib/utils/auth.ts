import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "cognicms_session";
const SESSION_DURATION_HOURS = Number(process.env.SESSION_DURATION ?? 24);

export interface AuthSession {
  sub: string;
  createdAt: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionResponse(): Promise<NextResponse> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSION_DURATION_HOURS * 60 * 60;
  const token = await new SignJWT({ createdAt: new Date().toISOString() })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject("cognicms-user")
    .setExpirationTime(exp)
    .sign(getSecretKey());

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: SESSION_DURATION_HOURS * 60 * 60,
  });

  return response;
}

export function destroySessionResponse(): NextResponse {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function getSession(): Promise<AuthSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      sub: typeof payload.sub === "string" ? payload.sub : "cognicms-user",
      createdAt: String(payload.createdAt ?? ""),
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to verify session token", error);
    }
    return null;
  }
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }
  return session;
}

export async function isSessionValid(token?: string | null): Promise<boolean> {
  if (!token) {
    return false;
  }
  try {
    await jwtVerify(token, getSecretKey());
    return true;
  } catch {
    return false;
  }
}

export function verifyPassword(password: string): boolean {
  const expected = process.env.CMS_PASSWORD;
  if (!expected) {
    throw new Error("CMS_PASSWORD is not configured");
  }
  return password === expected;
}
