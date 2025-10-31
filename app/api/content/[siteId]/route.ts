import { NextRequest, NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/storage/sites";
import { requireSession } from "@/lib/utils/auth";
import { getDraftContent, setDraftContent } from "@/lib/storage/cache";
import { getFileContent } from "@/lib/github/operations";
import { WebsiteContent } from "@/types/content";

async function ensureAuth() {
  try {
    await requireSession();
    return true;
  } catch {
    return false;
  }
}

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  const authed = await ensureAuth();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { siteId } = await context.params;

  const site = await getSiteConfig(siteId);
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const draft = getDraftContent(siteId);
  if (draft) {
    return NextResponse.json({ content: draft, draft: true });
  }

  const file = await getFileContent(site, site.contentFile);
  const content = JSON.parse(file.content) as WebsiteContent;
  setDraftContent(site.id, content);
  return NextResponse.json({ content, draft: false });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  const authed = await ensureAuth();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { siteId } = await context.params;
  setDraftContent(siteId, body as WebsiteContent);
  return NextResponse.json({ success: true });
}
