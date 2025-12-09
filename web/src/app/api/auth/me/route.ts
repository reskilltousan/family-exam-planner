import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const payload = verifySession(session);
  if (!payload?.familyId) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const family = await prisma.family.findUnique({
    where: { id: payload.familyId },
    select: { id: true, name: true, email: true },
  });

  if (!family) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  return NextResponse.json(family);
}
