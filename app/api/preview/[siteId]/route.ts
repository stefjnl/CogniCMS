import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/utils/auth";
import { getSiteConfig } from "@/lib/storage/sites";
import { applyChangesToHTML, addChangeHighlights } from "@/lib/content/preview";
import { PreviewChange } from "@/types/content";

// Note: Uses Node.js runtime due to HTML manipulation with JSDOM
// Consider migrating to Edge Runtime with linkedom or other Edge-compatible parser
export const runtime = "nodejs";

function authError() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  console.log("[PREVIEW_API] POST request received");

  try {
    await requireSession();
  } catch {
    console.log("[PREVIEW_API] Authentication failed");
    return authError();
  }

  const { siteId } = await context.params;
  console.log("[PREVIEW_API] Processing request for siteId:", siteId);

  const site = await getSiteConfig(siteId);
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { currentHTML, changes, sections, publishId } = body as {
    currentHTML: string;
    changes: PreviewChange[];
    sections?: any[];
    publishId?: string;
  };

  // TRACE: Log incoming request data
  console.log("[PREVIEW_API] Request received for site:", siteId);
  if (publishId) {
    console.log("[PREVIEW_API] Publish ID:", publishId);
  }
  console.log("[PREVIEW_API] Current HTML length:", currentHTML?.length || 0);
  console.log("[PREVIEW_API] Changes received:", changes?.length || 0);
  console.log(
    "[PREVIEW_API] Changes details:",
    JSON.stringify(changes, null, 2)
  );
  console.log(
    "[PREVIEW_API] Current HTML preview:",
    currentHTML?.substring(0, 200) + "..."
  );

  try {
    // Apply changes to HTML
    console.log("[PREVIEW_API] Applying changes to HTML...");
    const updatedHTML = applyChangesToHTML(currentHTML, changes, sections);
    console.log("[PREVIEW_API] Updated HTML length:", updatedHTML?.length || 0);
    console.log(
      "[PREVIEW_API] Updated HTML preview:",
      updatedHTML?.substring(0, 200) + "..."
    );

    // Add highlights to changed elements
    console.log("[PREVIEW_API] Adding highlights to changed elements...");
    const highlightedHTML = addChangeHighlights(updatedHTML, changes, sections);
    console.log(
      "[PREVIEW_API] Highlighted HTML length:",
      highlightedHTML?.length || 0
    );
    console.log(
      "[PREVIEW_API] Highlighted HTML preview:",
      highlightedHTML?.substring(0, 200) + "..."
    );

    const responseHtml = highlightedHTML;
    console.log(
      "[PREVIEW_API] Returning HTML length:",
      responseHtml?.length || 0
    );
    if (publishId) {
      console.log("[PREVIEW_API] Returning HTML for Publish ID:", publishId);
      console.log(
        "[PREVIEW_API] HTML checksum:",
        responseHtml?.length.toString() +
          "_" +
          responseHtml?.substring(0, 50).replace(/\s/g, "")
      );
    }

    return NextResponse.json({
      html: responseHtml,
    });
  } catch (error) {
    console.error("[PREVIEW_API] Preview generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 }
    );
  }
}
