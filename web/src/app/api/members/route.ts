import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getFamilyId } from "@/lib/family";
import { memberIdSchema, memberSchema, memberUpdateSchema } from "@/lib/validation";

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

export async function PUT(req: NextRequest) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  const json = await req.json();
  const parsed = memberUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.member.findFirst({ where: { id: parsed.data.id, familyId } });
  if (!existing) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const updated = await prisma.member.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      role: parsed.data.role,
      grade: parsed.data.grade,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  const json = await req.json();
  const parsed = memberIdSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const memberId = parsed.data.id;

  const existing = await prisma.member.findFirst({ where: { id: memberId, familyId } });
  if (!existing) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.task.updateMany({ where: { assigneeId: memberId }, data: { assigneeId: null } }),
    prisma.eventParticipant.deleteMany({ where: { memberId } }),
    prisma.eventNote.updateMany({ where: { memberId }, data: { memberId: null } }),
    prisma.member.delete({ where: { id: memberId } }),
  ]);

  return NextResponse.json({ ok: true });
}
