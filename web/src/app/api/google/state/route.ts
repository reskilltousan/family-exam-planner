import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getFamilyId } from "@/lib/family";

export async function GET(req: NextRequest) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  try {
    const token = await prisma.oAuthToken.findFirst({
      where: { familyId, provider: "google" },
    });

    const [latestExternal] = await prisma.externalEvent.findMany({
      where: { familyId, source: "google" },
      orderBy: { lastSyncedAt: "desc" },
      take: 1,
    });

    const externalCount = await prisma.externalEvent.count({
      where: { familyId, source: "google" },
    });

    const expired =
      token?.expiresAt != null ? token.expiresAt.getTime() <= Date.now() : false;

    return NextResponse.json({
      connected: !!token,
      expired,
      expiresAt: token?.expiresAt ?? null,
      lastSyncedAt: latestExternal?.lastSyncedAt ?? token?.updatedAt ?? null,
      hasRefreshToken: !!token?.refreshToken,
      externalEventsCount: externalCount,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
