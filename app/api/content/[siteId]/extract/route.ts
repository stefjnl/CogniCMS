import { NextRequest, NextResponse } from "next/server";
import { extractContentFromHtml } from "@/lib/content/extractor";
import { getFileContent } from "@/lib/github/operations";
import { getSiteConfig } from "@/lib/storage/sites";
import { setDraftContent } from "@/lib/storage/cache";
import { requireSession } from "@/lib/utils/auth";
import { withRateLimit, addRateLimitHeaders } from "@/lib/utils/ratelimit";

// Note: Uses Node.js runtime due to HTML extraction with JSDOM
// Consider migrating to Edge Runtime with linkedom or other Edge-compatible parser
export const runtime = "nodejs";

function authError() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  // Get session first to extract tier for rate limiting
  let session;
  try {
    session = await requireSession();
  } catch {
    return authError();
  }

  // Rate limiting: Tier-based limits for content extraction
  // Free: 20/min, Pro: 100/min, Enterprise: 400/min
  const rateLimitResult = await withRateLimit(request, {
    type: "extract",
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

  const htmlFile = await getFileContent(site, site.htmlFile);
  const content = extractContentFromHtml(htmlFile.content);
  setDraftContent(site.id, content);
  const response = NextResponse.json({ content });
  return addRateLimitHeaders(response, rateLimitResult.result);
}
