import { NextRequest, NextResponse } from "next/server";
import { createSite, listSites } from "@/lib/storage/sites";
import { requireSession } from "@/lib/utils/auth";
import { siteSchema } from "@/lib/utils/validation";
import {
  AuthError,
  ValidationError,
  sanitizeError,
  logError,
} from "@/lib/utils/errors";
import { withRateLimit, addRateLimitHeaders } from "@/lib/utils/ratelimit";

// Note: Uses Node.js runtime due to file-based storage (fs, path, crypto)
// To enable Edge Runtime: migrate to database storage (e.g., Vercel KV, Postgres)
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    logError(error, { route: "/api/sites", method: "GET" });
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  // Rate limiting: Tier-based limits for sites API
  // Free: 30/min, Pro: 150/min, Enterprise: 600/min
  const rateLimitResult = await withRateLimit(request, {
    type: "sites",
    tier: session.tier,
  });
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const sites = await listSites();
    const response = NextResponse.json({ sites });
    return addRateLimitHeaders(response, rateLimitResult.result);
  } catch (error) {
    logError(error, { route: "/api/sites", method: "GET" });

    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sanitized = sanitizeError(error);
    return NextResponse.json(
      { error: sanitized.message, digest: sanitized.digest },
      { status: sanitized.statusCode }
    );
  }
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    logError(error, { route: "/api/sites", method: "POST" });
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  // Rate limiting: Tier-based limits for sites API
  // Free: 30/min, Pro: 150/min, Enterprise: 600/min
  const rateLimitResult = await withRateLimit(request, {
    type: "sites",
    tier: session.tier,
  });
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const body = await request.json();
    const parsed = siteSchema.parse(body);
    const site = await createSite(parsed);
    const response = NextResponse.json({ site }, { status: 201 });
    return addRateLimitHeaders(response, rateLimitResult.result);
  } catch (error) {
    logError(error, { route: "/api/sites", method: "POST" });

    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Zod validation errors
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ZodError"
    ) {
      return NextResponse.json(
        { error: "Invalid request data", details: error },
        { status: 400 }
      );
    }

    const sanitized = sanitizeError(error);
    return NextResponse.json(
      { error: sanitized.message, digest: sanitized.digest },
      { status: sanitized.statusCode }
    );
  }
}
