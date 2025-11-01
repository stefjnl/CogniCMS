import { NextRequest } from "next/server";
import { isSessionValid } from "@/lib/utils/auth";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/editor",
  "/api/sites",
  "/api/content",
  "/api/chat",
  "/api/publish",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiresAuth = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!requiresAuth) {
    return;
  }

  const token = request.cookies.get("cognicms_session")?.value;
  const valid = await isSessionValid(token);
  if (!valid) {
    if (pathname.startsWith("/api")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const loginUrl = new URL("/", request.url);
    return Response.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};