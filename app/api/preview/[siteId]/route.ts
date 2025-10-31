import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/utils/auth";
import { getSiteConfig } from "@/lib/storage/sites";
import { applyChangesToHTML, addChangeHighlights } from "@/lib/content/preview";
import { PreviewChange } from "@/types/content";

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
  const { currentHTML, changes } = body as {
    currentHTML: string;
    changes: PreviewChange[];
  };

  try {
    // Apply changes to HTML
    const updatedHTML = applyChangesToHTML(currentHTML, changes);

    // Add highlights to changed elements
    const highlightedHTML = addChangeHighlights(updatedHTML, changes);

    return NextResponse.json({
      html: highlightedHTML,
    });
  } catch (error) {
    console.error("Preview generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 }
    );
  }
}
