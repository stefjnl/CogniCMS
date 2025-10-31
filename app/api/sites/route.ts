import { NextRequest, NextResponse } from "next/server";
import { createSite, listSites } from "@/lib/storage/sites";
import { requireSession } from "@/lib/utils/auth";
import { siteSchema } from "@/lib/utils/validation";

function authError() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  try {
    await requireSession();
  } catch {
    return authError();
  }

  const sites = await listSites();
  return NextResponse.json({ sites });
}

export async function POST(request: NextRequest) {
  try {
    await requireSession();
  } catch {
    return authError();
  }

  const body = await request.json();
  const parsed = siteSchema.parse(body);
  const site = await createSite(parsed);
  return NextResponse.json({ site }, { status: 201 });
}
