import { NextRequest, NextResponse } from "next/server";
import {
  publishFiles,
  getFileContent,
  validateGitHubPermissions,
} from "@/lib/github/operations";
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
import { JSDOM } from "jsdom";
import { withRateLimit, addRateLimitHeaders } from "@/lib/utils/ratelimit";

// Note: Uses Node.js runtime due to HTML highlight stripping with JSDOM
// Consider migrating to Edge Runtime with linkedom for better performance
export const runtime = "nodejs";

function authError() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  const traceId = request.headers.get("x-trace-id") ?? "publish-post";
  console.log("[PUBLISH_API] Starting publish request");

  // Get session first to extract tier for rate limiting
  let session;
  try {
    session = await requireSession();
    console.log("[PUBLISH_API] Session authenticated");
  } catch {
    console.log("[PUBLISH_API] Session authentication failed");
    return authError();
  }

  // Rate limiting: Tier-based limits for publish (GitHub API)
  // Free: 5/min, Pro: 25/min, Enterprise: 100/min
  const rateLimitResult = await withRateLimit(request, {
    type: "publish",
    tier: session.tier,
  });
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
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

    // Log HTML details if present
    if (body.html) {
      console.log(
        "[PUBLISH_API] Received HTML length:",
        body.html?.length || 0
      );
      console.log(
        "[PUBLISH_API] Received HTML checksum:",
        body.html?.length.toString() +
          "_" +
          body.html?.substring(0, 50).replace(/\s/g, "")
      );
      console.log(
        "[PUBLISH_API] Received HTML preview:",
        body.html?.substring(0, 200) + "..."
      );

      // Check for change highlights
      const hasHighlights =
        body.html.includes("cognicms-changed") ||
        body.html.includes("data-cognicms-change-id");
      console.log(
        "[PUBLISH_API] Received HTML contains change highlights:",
        hasHighlights
      );
    }
  } catch (error) {
    console.error("[PUBLISH_API] Failed to parse request body:", error);
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  let parsed;
  try {
    parsed = publishSchema.parse(body);
    console.log("[PUBLISH_API] Body validated successfully");
  } catch (error) {
    console.error("[PUBLISH_API] Validation error:", error);
    return NextResponse.json(
      { error: "Invalid request data", details: error },
      { status: 400 }
    );
  }

  const content = parsed.content as WebsiteContent;
  console.log("[PUBLISH_API] Content type:", typeof content);
  console.log(
    "[PUBLISH_API] Content keys:",
    content ? Object.keys(content) : "null"
  );

  const draft = getDraftContent(siteId);
  if (!draft) {
    console.log("[PUBLISH_API] No draft found, setting new draft");
    setDraftContent(siteId, content, {
      traceId,
      source: "publish-route:post",
    });
  } else {
    console.log("[PUBLISH_API] Draft found");
  }

  let finalHtml;
  try {
    if (parsed.html) {
      // Use the provided HTML directly (it already has the changes applied)
      finalHtml = parsed.html;

      // DEBUG LOGGING: Track HTML details
      console.log(
        "[PUBLISH_API] Using provided HTML with changes applied, length:",
        finalHtml.length
      );
      console.log(
        "[PUBLISH_API] HTML preview (first 200 chars):",
        finalHtml.substring(0, 200) + "..."
      );

      // Check if this looks like the updated HTML by looking for change highlights
      const hasChangeHighlights =
        finalHtml.includes("cognicms-changed") ||
        finalHtml.includes("data-cognicms-change-id");
      console.log(
        "[PUBLISH_API] HTML contains change highlights:",
        hasChangeHighlights
      );

      // Log a checksum to help identify if it's the right HTML
      const simpleChecksum =
        finalHtml.length.toString() +
        "_" +
        finalHtml.substring(0, 50).replace(/\s/g, "");
      console.log("[PUBLISH_API] HTML checksum for debugging:", simpleChecksum);

      // CRITICAL: Strip change highlights before publishing to GitHub
      // The highlighted HTML is only for preview, not for publishing
      if (hasChangeHighlights) {
        console.log(
          "[PUBLISH_API] Stripping change highlights before publishing..."
        );
        const dom = new JSDOM(finalHtml);
        const { document } = dom.window;

        // Remove highlight styles
        const highlightStyles = document.querySelector(
          "style[data-cognicms-highlight]"
        );
        if (highlightStyles) {
          highlightStyles.remove();
        } else {
          // Try to find style containing cognicms-changed
          const allStyles = document.querySelectorAll("style");
          allStyles.forEach((style) => {
            if (
              style.textContent &&
              style.textContent.includes("cognicms-changed")
            ) {
              style.remove();
            }
          });
        }

        // Remove highlight classes and attributes
        const changedElements = document.querySelectorAll(".cognicms-changed");
        changedElements.forEach((element) => {
          element.classList.remove("cognicms-changed");
          element.removeAttribute("data-cognicms-change-id");
        });

        // Serialize back to HTML
        const cleanedHtml = dom.serialize();
        console.log(
          "[PUBLISH_API] HTML after stripping highlights length:",
          cleanedHtml.length
        );
        console.log(
          "[PUBLISH_API] Cleaned HTML checksum:",
          cleanedHtml.length.toString() +
            "_" +
            cleanedHtml.substring(0, 50).replace(/\s/g, "")
        );

        finalHtml = cleanedHtml;
      }
    } else {
      // If no HTML provided, fetch base HTML and regenerate from content
      const fileContent = await getFileContent(site, site.htmlFile);
      const baseHtml = fileContent.content;
      console.log(
        "[PUBLISH_API] Fetched HTML from file, length:",
        baseHtml.length
      );
      finalHtml = generateHtmlFromContent(baseHtml, content);
      console.log(
        "[PUBLISH_API] Generated HTML from content, length:",
        finalHtml.length
      );
    }
  } catch (error) {
    console.error("[PUBLISH_API] Failed to get HTML:", error);
    return NextResponse.json(
      { error: "Failed to prepare HTML file" },
      { status: 500 }
    );
  }

  const files = [
    {
      path: site.contentFile,
      content: JSON.stringify(content, null, 2),
    },
    {
      path: site.htmlFile,
      content: finalHtml,
    },
  ];
  console.log("[PUBLISH_API] Prepared files for publishing");

  // Validate GitHub permissions before attempting to publish
  console.log("[PUBLISH_API] Validating GitHub permissions...");
  const validation = await validateGitHubPermissions(site);
  if (!validation.valid) {
    console.error(
      "[PUBLISH_API] Permission validation failed:",
      validation.error
    );
    return NextResponse.json(
      {
        error: validation.error || "GitHub permission validation failed",
        success: false,
      },
      { status: 403 }
    );
  }
  console.log("[PUBLISH_API] Permissions validated successfully");

  let result;
  try {
    result = await publishFiles(site, files, parsed.commitMessage);
    console.log("[PUBLISH_API] Publish completed successfully");
  } catch (error) {
    console.error("[PUBLISH_API] Publish failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to publish",
        success: false,
      },
      { status: 500 }
    );
  }

  clearDraftContent(siteId);
  console.log("[PUBLISH_API] Draft cleared");

  const response = NextResponse.json({
    ...result,
    diff: draft ? diffWebsiteContent(draft, content) : [],
  });

  return addRateLimitHeaders(response, rateLimitResult.result);
}
