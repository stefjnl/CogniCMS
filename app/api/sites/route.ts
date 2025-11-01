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

// Note: Uses Node.js runtime due to file-based storage (fs, path, crypto)
// To enable Edge Runtime: migrate to database storage (e.g., Vercel KV, Postgres)
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireSession();
    const sites = await listSites();
    return NextResponse.json({ sites });
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
  try {
    await requireSession();
    const body = await request.json();
    const parsed = siteSchema.parse(body);
    const site = await createSite(parsed);
    return NextResponse.json({ site }, { status: 201 });
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
