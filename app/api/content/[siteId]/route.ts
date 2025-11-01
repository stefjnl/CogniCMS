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

  // First try to get the most recent content by extracting from HTML
  try {
    const htmlFile = await getFileContent(site, site.htmlFile);
    const { extractContentFromHtml } = await import("@/lib/content/extractor");
    const extractedContent = extractContentFromHtml(htmlFile.content);

    // Check if there's a draft with more recent modifications
    const draft = getDraftContent(siteId);
    if (draft && draft.metadata && draft.metadata.lastModified) {
      const draftDate = new Date(draft.metadata.lastModified);
      const extractedDate = new Date(extractedContent.metadata.lastModified);

      if (draftDate > extractedDate) {
        const response = NextResponse.json({ content: draft, draft: true });
        return addRateLimitHeaders(response, rateLimitResult.result);
      }
    }

    setDraftContent(site.id, extractedContent);
    const response = NextResponse.json({
      content: extractedContent,
      draft: false,
    });
    return addRateLimitHeaders(response, rateLimitResult.result);
  } catch (error) {
    // Fallback to existing content.json if extraction fails
    const draft = getDraftContent(siteId);
    if (draft) {
      const response = NextResponse.json({ content: draft, draft: true });
      return addRateLimitHeaders(response, rateLimitResult.result);
    }

    const file = await getFileContent(site, site.contentFile);
    const content = JSON.parse(file.content) as WebsiteContent;
    setDraftContent(site.id, content);
    const response = NextResponse.json({ content, draft: false });
    return addRateLimitHeaders(response, rateLimitResult.result);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
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
  setDraftContent(siteId, body as WebsiteContent);
  const response = NextResponse.json({ success: true });
  return addRateLimitHeaders(response, rateLimitResult.result);
}
