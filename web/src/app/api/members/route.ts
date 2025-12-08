import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getFamilyId } from "@/lib/family";
import { memberSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  const members = await prisma.member.findMany({
    where: { familyId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  const json = await req.json();
  const parsed = memberSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await prisma.member.create({
    data: { ...parsed.data, familyId },
  });

  return NextResponse.json(member, { status: 201 });
}
