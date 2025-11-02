import { NextRequest, NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/storage/sites";
import { requireSession } from "@/lib/utils/auth";
import { getDraftContent, setDraftContent } from "@/lib/storage/cache";
import { getFileContent } from "@/lib/github/operations";
import { WebsiteContent } from "@/types/content";
import { withRateLimit, addRateLimitHeaders } from "@/lib/utils/ratelimit";

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

  // No draft exists - load from content.json file
  try {
    console.log("[GET_CONTENT] No draft found, loading from content.json");
    const file = await getFileContent(site, site.contentFile);
    const content = JSON.parse(file.content) as WebsiteContent;
    setDraftContent(site.id, content, {
      traceId,
      source: "content-route:get:content-json",
    });
    const response = NextResponse.json({ content, draft: false });
    return addRateLimitHeaders(response, rateLimitResult.result);
  } catch (error) {
    // Fallback: extract from HTML if content.json doesn't exist
    console.log("[GET_CONTENT] content.json not found, extracting from HTML");
    const htmlFile = await getFileContent(site, site.htmlFile);
    const { extractContentFromHtml } = await import("@/lib/content/extractor");
    const extractedContent = extractContentFromHtml(htmlFile.content);
    setDraftContent(site.id, extractedContent, {
      traceId,
      source: "content-route:get:html-fallback",
    });
    const response = NextResponse.json({
      content: extractedContent,
      draft: false,
    });
    return addRateLimitHeaders(response, rateLimitResult.result);
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
