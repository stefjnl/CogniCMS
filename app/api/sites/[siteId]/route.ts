import { NextRequest, NextResponse } from "next/server";
import { deleteSite, getSiteConfig, updateSite } from "@/lib/storage/sites";
import { requireSession } from "@/lib/utils/auth";
import { siteSchema } from "@/lib/utils/validation";

// Note: Uses Node.js runtime due to file-based storage (fs, path, crypto)
// To enable Edge Runtime: migrate to database storage (e.g., Vercel KV, Postgres)
export const runtime = "nodejs";

function authError() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(
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

  return NextResponse.json({ site });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  try {
    await requireSession();
  } catch {
    return authError();
  }

  const body = await request.json();
  const parsed = siteSchema.partial().parse(body);
  const { siteId } = await context.params;
  const site = await updateSite(siteId, parsed);
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ site });
}

export async function DELETE(
  _: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  try {
    await requireSession();
  } catch {
    return authError();
  }

  const { siteId } = await context.params;
  await deleteSite(siteId);
  return NextResponse.json({ success: true });
}
