import { NextRequest, NextResponse } from "next/server";
import { deleteSite, getSiteConfig, updateSite } from "@/lib/storage/sites";
import { requireSession } from "@/lib/utils/auth";
import { siteSchema } from "@/lib/utils/validation";
import {
  AuthError,
  NotFoundError,
  sanitizeError,
  logError,
} from "@/lib/utils/errors";
import { withRateLimit, addRateLimitHeaders } from "@/lib/utils/ratelimit";

// Note: Uses Node.js runtime due to file-based storage (fs, path, crypto)
// To enable Edge Runtime: migrate to database storage (e.g., Vercel KV, Postgres)
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    logError(error, { route: "/api/sites/[siteId]", method: "GET" });
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
    const { siteId } = await context.params;
    const site = await getSiteConfig(siteId);

    if (!site) {
      throw new NotFoundError("Site");
    }

    const response = NextResponse.json({ site });
    return addRateLimitHeaders(response, rateLimitResult.result);
  } catch (error) {
    logError(error, { route: "/api/sites/[siteId]", method: "GET" });

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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    logError(error, { route: "/api/sites/[siteId]", method: "PATCH" });
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
    const parsed = siteSchema.partial().parse(body);
    const { siteId } = await context.params;
    const site = await updateSite(siteId, parsed);

    if (!site) {
      throw new NotFoundError("Site");
    }

    const response = NextResponse.json({ site });
    return addRateLimitHeaders(response, rateLimitResult.result);
  } catch (error) {
    logError(error, { route: "/api/sites/[siteId]", method: "PATCH" });

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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    logError(error, { route: "/api/sites/[siteId]", method: "DELETE" });
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
    const { siteId } = await context.params;

    // Check if site exists before deleting
    const site = await getSiteConfig(siteId);
    if (!site) {
      throw new NotFoundError("Site");
    }

    await deleteSite(siteId);
    const response = NextResponse.json({ success: true });
    return addRateLimitHeaders(response, rateLimitResult.result);
  } catch (error) {
    logError(error, { route: "/api/sites/[siteId]", method: "DELETE" });

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
