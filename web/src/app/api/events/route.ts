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

  const { participantIds, templateId, ...data } = parsed.data;

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
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

    if (templateId) {
      const template = await tx.template.findUnique({
        where: { id: templateId },
        include: { tasks: true },
      });
      if (template) {
        const startDate = new Date(data.startAt);
        const taskData = template.tasks.map((t) => ({
          title: t.title,
          eventId: created.id,
          dueDate: t.daysBeforeEvent != null ? new Date(startDate.getTime() - t.daysBeforeEvent * 24 * 60 * 60 * 1000) : null,
        }));
        if (taskData.length > 0) {
          await tx.task.createMany({ data: taskData });
        }
      }
    }

    const refreshed = await tx.event.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        participants: { include: { member: true } },
        tasks: true,
        notes: true,
      },
    });

    return refreshed;
  });

  return NextResponse.json(event, { status: 201 });
}
