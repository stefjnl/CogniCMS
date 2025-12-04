import { NextRequest, NextResponse } from "next/server";
import { extractContentFromHtml } from "@/lib/content/extractor";
import { getFileContent } from "@/lib/github/operations";
import { getSiteConfig } from "@/lib/storage/sites";
import { setDraftContent, clearDraftContent } from "@/lib/storage/cache";
import { requireSession } from "@/lib/utils/auth";
import { withRateLimit, addRateLimitHeaders } from "@/lib/utils/ratelimit";
import { WebsiteContent } from "@/types/content";

// Note: Uses Node.js runtime due to HTML extraction with JSDOM
export const runtime = "nodejs";

function authError() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * POST /api/content/[siteId]/sync
 * 
 * Syncs content from GitHub, bypassing any local development cache.
 * This fetches the latest index.html AND content.json directly from GitHub,
 * treating GitHub as the single source of truth.
 * 
 * Returns:
 * - content: The WebsiteContent (from content.json if exists, or freshly extracted from HTML)
 * - html: The raw HTML content
 * - source: "content-json" | "html-extraction" indicating where content came from
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  const traceId = request.headers.get("x-trace-id") ?? "content-sync";
  
  // Get session first to extract tier for rate limiting
  let session;
  try {
    session = await requireSession();
  } catch {
    return authError();
  }

  // Rate limiting: Same as extract endpoint
  const rateLimitResult = await withRateLimit(request, {
    type: "extract",
    tier: session.tier,
  });
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  const { siteId } = await context.params;
  console.log("[SYNC_API] Starting sync for site:", siteId);

  const site = await getSiteConfig(siteId);
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  // Clear any existing draft to ensure we start fresh
  clearDraftContent(siteId);
  console.log("[SYNC_API] Cleared existing draft cache");

  try {
    // Force fetch from GitHub (bypass local dev cache)
    console.log("[SYNC_API] Fetching HTML from GitHub...");
    const htmlFile = await getFileContent(site, site.htmlFile, { forceRemote: true });
    console.log("[SYNC_API] HTML fetched, length:", htmlFile.content.length);

    let content: WebsiteContent;
    let source: "content-json" | "html-extraction";

    // Try to fetch content.json first (it's the structured source of truth for editing)
    try {
      console.log("[SYNC_API] Attempting to fetch content.json from GitHub...");
      const contentFile = await getFileContent(site, site.contentFile, { forceRemote: true });
      content = JSON.parse(contentFile.content) as WebsiteContent;
      source = "content-json";
      console.log("[SYNC_API] content.json loaded successfully");
    } catch (contentError) {
      // No content.json exists, extract from HTML
      console.log("[SYNC_API] content.json not found, extracting from HTML...");
      content = extractContentFromHtml(htmlFile.content, {
        htmlFilePath: site.htmlFile,
        siteConfig: site,
      });
      source = "html-extraction";
      console.log("[SYNC_API] Content extracted from HTML");
    }

    // Update the draft cache with fresh content
    setDraftContent(siteId, content, {
      traceId,
      source: `sync-route:${source}`,
    });
    console.log("[SYNC_API] Draft cache updated");

    const response = NextResponse.json({
      content,
      html: htmlFile.content,
      source,
      message: source === "content-json" 
        ? "Synced from GitHub content.json" 
        : "Synced from GitHub HTML (no content.json found)",
    });
    
    return addRateLimitHeaders(response, rateLimitResult.result);
  } catch (error) {
    console.error("[SYNC_API] Sync failed:", error);
    return NextResponse.json(
      { 
        error: "Failed to sync from GitHub", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
