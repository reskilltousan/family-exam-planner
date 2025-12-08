import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getFamilyId } from "@/lib/family";
import { taskSchema, taskUpdateSchema } from "@/lib/validation";

async function ensureEvent(familyId: string, eventId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, familyId },
    select: { id: true },
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }
  const eventId = params.id;
  const event = await ensureEvent(familyId, eventId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const tasks = await prisma.task.findMany({
    where: { eventId },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }
  const eventId = params.id;
  const event = await ensureEvent(familyId, eventId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const json = await req.json();
  const parsed = taskSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: { ...parsed.data, eventId },
  });
  return NextResponse.json(task, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }
  const eventId = params.id;
  const event = await ensureEvent(familyId, eventId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const json = await req.json();
  const parsed = taskUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...data } = parsed.data;
  const updated = await prisma.task.update({
    where: { id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }
  const eventId = params.id;
  const event = await ensureEvent(familyId, eventId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const json = await req.json();
  const taskId = json?.taskId as string | undefined;
  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  await prisma.task.delete({ where: { id: taskId } });
  return NextResponse.json({ ok: true });
}
