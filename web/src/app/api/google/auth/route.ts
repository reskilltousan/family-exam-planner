import { NextRequest, NextResponse } from "next/server";
import { getFamilyId } from "@/lib/family";
import { getAuthUrl } from "@/lib/google";

export async function GET(req: NextRequest) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }
  try {
    const url = getAuthUrl(familyId);
    return NextResponse.redirect(url);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
