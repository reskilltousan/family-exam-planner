import { NextRequest, NextResponse } from "next/server";
import { getFamilyId } from "@/lib/family";
import { fetchExternalEvents } from "@/lib/google";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }
  const url = new URL(req.url);
  const timeMin = url.searchParams.get("timeMin") ?? undefined;
  const timeMax = url.searchParams.get("timeMax") ?? undefined;

  try {
    await fetchExternalEvents(familyId, timeMin, timeMax);
    const externalEvents = await prisma.externalEvent.findMany({
      where: { familyId, source: "google" },
      orderBy: { startAt: "asc" },
    });
    return NextResponse.json(externalEvents);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
