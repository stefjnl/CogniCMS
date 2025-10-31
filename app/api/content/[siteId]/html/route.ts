import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/utils/auth";
import { getSiteConfig } from "@/lib/storage/sites";
import { getFileContent } from "@/lib/github/operations";

function authError() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(
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

  try {
    const htmlFile = await getFileContent(site, site.htmlFile);
    return NextResponse.json({ html: htmlFile.content });
  } catch (error) {
    console.error("Failed to fetch HTML:", error);
    return NextResponse.json(
      { error: "Failed to fetch HTML file" },
      { status: 500 }
    );
  }
}
