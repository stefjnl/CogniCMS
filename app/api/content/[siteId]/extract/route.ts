import { NextRequest, NextResponse } from "next/server";
import { extractContentFromHtml } from "@/lib/content/extractor";
import { getFileContent } from "@/lib/github/operations";
import { getSiteConfig } from "@/lib/storage/sites";
import { setDraftContent } from "@/lib/storage/cache";
import { requireSession } from "@/lib/utils/auth";

// Note: Uses Node.js runtime due to HTML extraction with JSDOM
// Consider migrating to Edge Runtime with linkedom or other Edge-compatible parser
export const runtime = "nodejs";

function authError() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(
  _: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  try {
    await requireSession();
  } catch {
    return authError();
  }

  const { siteId } = await context.params;

  const site = await getSiteConfig(siteId);
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const htmlFile = await getFileContent(site, site.htmlFile);
  const content = extractContentFromHtml(htmlFile.content);
  setDraftContent(site.id, content);
  return NextResponse.json({ content });
}
