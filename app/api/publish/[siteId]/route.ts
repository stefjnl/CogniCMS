import { NextRequest, NextResponse } from "next/server";
import { publishFiles, getFileContent } from "@/lib/github/operations";
import { getSiteConfig } from "@/lib/storage/sites";
import {
  clearDraftContent,
  getDraftContent,
  setDraftContent,
} from "@/lib/storage/cache";
import { diffWebsiteContent } from "@/lib/content/differ";
import { generateHtmlFromContent } from "@/lib/content/generator";
import { requireSession } from "@/lib/utils/auth";
import { publishSchema } from "@/lib/utils/validation";
import { WebsiteContent } from "@/types/content";

function authError() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(
  request: NextRequest,
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

  const body = await request.json();
  const parsed = publishSchema.parse(body);

  const content = parsed.content as WebsiteContent;
  const draft = getDraftContent(siteId);
  if (!draft) {
    setDraftContent(siteId, content);
  }

  const baseHtml =
    parsed.html ?? (await getFileContent(site, site.htmlFile)).content;
  const regeneratedHtml = generateHtmlFromContent(baseHtml, content);

  const files = [
    {
      path: site.contentFile,
      content: JSON.stringify(content, null, 2),
    },
    {
      path: site.htmlFile,
      content: regeneratedHtml,
    },
  ];

  const result = await publishFiles(site, files, parsed.commitMessage);
  clearDraftContent(siteId);

  return NextResponse.json({
    ...result,
    diff: draft ? diffWebsiteContent(draft, content) : [],
  });
}
