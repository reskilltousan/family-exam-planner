import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getFamilyId } from "@/lib/family";
import { eventSchema } from "@/lib/validation";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  const eventId = params.id;
  const existing = await prisma.event.findFirst({ where: { id: eventId, familyId } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const json = await req.json();
  const parsed = eventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { participantIds, ...data } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.eventParticipant.deleteMany({ where: { eventId } });
    return tx.event.update({
      where: { id: eventId },
      data: {
        ...data,
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
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  const eventId = params.id;
  const existing = await prisma.event.findFirst({ where: { id: eventId, familyId } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.eventParticipant.deleteMany({ where: { eventId } }),
    prisma.task.deleteMany({ where: { eventId } }),
    prisma.eventNote.deleteMany({ where: { eventId } }),
    prisma.event.delete({ where: { id: eventId } }),
  ]);

  return NextResponse.json({ ok: true });
}
