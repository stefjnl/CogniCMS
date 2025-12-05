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
 * Syncs content from GitHub, treating index.html as the single source of truth.
 * This fetches the latest index.html directly from GitHub and extracts content from it.
 * content.json is ignored; HTML is always re-extracted to ensure sync.
 * 
 * Returns:
 * - content: The WebsiteContent (always extracted from current index.html)
 * - html: The raw HTML content
 * - source: Always "html-extraction"
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
    console.log("[SYNC_API] Fetching HTML from GitHub as source of truth...");
    const htmlFile = await getFileContent(site, site.htmlFile, { forceRemote: true });
    console.log("[SYNC_API] HTML fetched, length:", htmlFile.content.length);

    // Always extract from HTML - it's the single source of truth
    console.log("[SYNC_API] Extracting content from HTML (html is source of truth)...");
    const content = extractContentFromHtml(htmlFile.content, {
      htmlFilePath: site.htmlFile,
      siteConfig: site,
    });
    console.log("[SYNC_API] Content extracted from HTML");

    // Update the draft cache with fresh content
    setDraftContent(siteId, content, {
      traceId,
      source: "sync-route:html-extraction",
    });
    console.log("[SYNC_API] Draft cache updated from HTML");

    const response = NextResponse.json({
      content,
      html: htmlFile.content,
      source: "html-extraction",
      message: "Synced from GitHub HTML (index.html is source of truth)",
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
