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

// Note: Uses Node.js runtime due to file-based storage (fs, path, crypto)
// To enable Edge Runtime: migrate to database storage (e.g., Vercel KV, Postgres)
export const runtime = "nodejs";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  try {
    await requireSession();
    const { siteId } = await context.params;
    const site = await getSiteConfig(siteId);

    if (!site) {
      throw new NotFoundError("Site");
    }

    return NextResponse.json({ site });
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
  try {
    await requireSession();
    const body = await request.json();
    const parsed = siteSchema.partial().parse(body);
    const { siteId } = await context.params;
    const site = await updateSite(siteId, parsed);

    if (!site) {
      throw new NotFoundError("Site");
    }

    return NextResponse.json({ site });
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
  _: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  try {
    await requireSession();
    const { siteId } = await context.params;

    // Check if site exists before deleting
    const site = await getSiteConfig(siteId);
    if (!site) {
      throw new NotFoundError("Site");
    }

    await deleteSite(siteId);
    return NextResponse.json({ success: true });
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
