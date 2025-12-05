import { getFileContent } from "@/lib/github/operations";
import { getDraftContent, setDraftContent } from "@/lib/storage/cache";
import { getSiteConfig } from "@/lib/storage/sites";
import { requireSession } from "@/lib/utils/auth";
import { addRateLimitHeaders, withRateLimit } from "@/lib/utils/ratelimit";
import { WebsiteContent } from "@/types/content";
import { NextRequest, NextResponse } from "next/server";

// Note: Uses Node.js runtime due to HTML extraction with JSDOM
// Consider migrating to Edge Runtime with linkedom or other Edge-compatible parser
export const runtime = "nodejs";

async function ensureAuth() {
  try {
    return await requireSession();
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  const traceId = request.headers.get("x-trace-id") ?? "content-get";
  const session = await ensureAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting: Tier-based limits for content API
  // Free: 60/min, Pro: 300/min, Enterprise: 1200/min
  const rateLimitResult = await withRateLimit(request, {
    type: "default",
    tier: session.tier,
  });
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  const { siteId } = await context.params;

  const site = await getSiteConfig(siteId);
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check if there's already a draft in cache - return it immediately
  const existingDraft = getDraftContent(siteId);
  if (existingDraft) {
    console.log("[GET_CONTENT] Returning cached draft");
    const response = NextResponse.json({ content: existingDraft, draft: true });
    return addRateLimitHeaders(response, rateLimitResult.result);
  }

  // No draft exists - extract from HTML (HTML is source of truth)
  // Note: content.json is generated from HTML, not a source
  try {
    console.log("[GET_CONTENT] No draft found, extracting from HTML (source of truth)");
    const htmlFile = await getFileContent(site, site.htmlFile);
    const { extractContentFromHtml } = await import("@/lib/content/extractor");
    const extractedContent = extractContentFromHtml(htmlFile.content, {
      htmlFilePath: site.htmlFile,
      siteConfig: site,
    });
    setDraftContent(site.id, extractedContent, {
      traceId,
      source: "content-route:get:html-extraction",
    });
    const response = NextResponse.json({
      content: extractedContent,
      draft: false,
    });
    return addRateLimitHeaders(response, rateLimitResult.result);
  } catch (error) {
    console.error("[GET_CONTENT] Failed to extract content from HTML:", error);
    return NextResponse.json(
      { error: "Failed to load content from HTML", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  const traceId = request.headers.get("x-trace-id") ?? "content-put";
  const session = await ensureAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting: Tier-based limits for content API
  // Free: 60/min, Pro: 300/min, Enterprise: 1200/min
  const rateLimitResult = await withRateLimit(request, {
    type: "default",
    tier: session.tier,
  });
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  const body = await request.json();
  const { siteId } = await context.params;
  setDraftContent(siteId, body as WebsiteContent, {
    traceId,
    source: "content-route:put",
  });
  const response = NextResponse.json({ success: true });
  return addRateLimitHeaders(response, rateLimitResult.result);
}
