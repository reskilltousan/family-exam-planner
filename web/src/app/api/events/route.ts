import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getFamilyId } from "@/lib/family";
import { eventSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  const url = new URL(req.url);
  const memberId = url.searchParams.get("memberId");

  const events = await prisma.event.findMany({
    where: {
      familyId,
      participants: memberId ? { some: { memberId } } : undefined,
    },
    include: {
      participants: { include: { member: true } },
      tasks: true,
      notes: true,
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  const json = await req.json();
  const parsed = eventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { participantIds, ...data } = parsed.data;

  const event = await prisma.event.create({
    data: {
      ...data,
      familyId,
      participants: {
        create: participantIds.map((id) => ({ memberId: id })),
      },
    },
    include: {
      participants: { include: { member: true } },
      tasks: true,
      notes: true,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
