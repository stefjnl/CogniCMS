import { NextRequest, NextResponse } from "next/server";
import { isSessionValid } from "@/lib/utils/auth";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/editor",
  "/api/sites",
  "/api/content",
  "/api/chat",
  "/api/publish",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiresAuth = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const token = request.cookies.get("cognicms_session")?.value;
  const valid = await isSessionValid(token);
  if (!valid) {
    if (pathname.startsWith("/api")) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
