import { NextRequest, NextResponse } from "next/server";
import { publishFiles, getFileContent, validateGitHubPermissions } from "@/lib/github/operations";
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
  console.log("[PUBLISH_API] Starting publish request");
  
  try {
    await requireSession();
    console.log("[PUBLISH_API] Session authenticated");
  } catch {
    console.log("[PUBLISH_API] Session authentication failed");
    return authError();
  }

  const { siteId } = await context.params;
  console.log("[PUBLISH_API] Site ID:", siteId);

  const site = await getSiteConfig(siteId);
  if (!site) {
    console.log("[PUBLISH_API] Site not found:", siteId);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  console.log("[PUBLISH_API] Site found:", site.name);

  let body;
  try {
    body = await request.json();
    console.log("[PUBLISH_API] Request body parsed successfully");
    console.log("[PUBLISH_API] Body keys:", Object.keys(body));
    console.log("[PUBLISH_API] Has content:", !!body.content);
    console.log("[PUBLISH_API] Has html:", !!body.html);
    console.log("[PUBLISH_API] Commit message:", body.commitMessage);
  } catch (error) {
    console.error("[PUBLISH_API] Failed to parse request body:", error);
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = publishSchema.parse(body);
    console.log("[PUBLISH_API] Body validated successfully");
  } catch (error) {
    console.error("[PUBLISH_API] Validation error:", error);
    return NextResponse.json({ error: "Invalid request data", details: error }, { status: 400 });
  }

  const content = parsed.content as WebsiteContent;
  console.log("[PUBLISH_API] Content type:", typeof content);
  console.log("[PUBLISH_API] Content keys:", content ? Object.keys(content) : 'null');
  
  const draft = getDraftContent(siteId);
  if (!draft) {
    console.log("[PUBLISH_API] No draft found, setting new draft");
    setDraftContent(siteId, content);
  } else {
    console.log("[PUBLISH_API] Draft found");
  }

  let baseHtml;
  try {
    if (parsed.html) {
      baseHtml = parsed.html;
      console.log("[PUBLISH_API] Using provided HTML, length:", baseHtml.length);
    } else {
      const fileContent = await getFileContent(site, site.htmlFile);
      baseHtml = fileContent.content;
      console.log("[PUBLISH_API] Fetched HTML from file, length:", baseHtml.length);
    }
  } catch (error) {
    console.error("[PUBLISH_API] Failed to get base HTML:", error);
    return NextResponse.json({ error: "Failed to fetch base HTML file" }, { status: 500 });
  }

  const regeneratedHtml = generateHtmlFromContent(baseHtml, content);
  console.log("[PUBLISH_API] Generated HTML, length:", regeneratedHtml.length);

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
  console.log("[PUBLISH_API] Prepared files for publishing");

  // Validate GitHub permissions before attempting to publish
  console.log("[PUBLISH_API] Validating GitHub permissions...");
  const validation = await validateGitHubPermissions(site);
  if (!validation.valid) {
    console.error("[PUBLISH_API] Permission validation failed:", validation.error);
    return NextResponse.json({
      error: validation.error || "GitHub permission validation failed",
      success: false
    }, { status: 403 });
  }
  console.log("[PUBLISH_API] Permissions validated successfully");

  let result;
  try {
    result = await publishFiles(site, files, parsed.commitMessage);
    console.log("[PUBLISH_API] Publish completed successfully");
  } catch (error) {
    console.error("[PUBLISH_API] Publish failed:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to publish",
      success: false
    }, { status: 500 });
  }

  clearDraftContent(siteId);
  console.log("[PUBLISH_API] Draft cleared");

  return NextResponse.json({
    ...result,
    diff: draft ? diffWebsiteContent(draft, content) : [],
  });
}
