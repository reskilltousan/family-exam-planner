import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { templateSchema, templateUpdateSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const eventType = url.searchParams.get("eventType") ?? undefined;

  const templates = await prisma.template.findMany({
    where: { eventType: eventType as any },
    include: { tasks: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = templateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tasks, ...data } = parsed.data;
  const template = await prisma.template.create({
    data: {
      ...data,
      tasks: tasks && tasks.length > 0 ? { create: tasks.map((t) => ({ ...t })) } : undefined,
    },
    include: { tasks: true },
  });
  return NextResponse.json(template, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const json = await req.json();
  const parsed = templateUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id, tasks, ...data } = parsed.data;

  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.templateTask.deleteMany({ where: { templateId: id } });
    const t = await tx.template.update({
      where: { id },
      data: {
        ...data,
        tasks: tasks && tasks.length > 0 ? { create: tasks.map((t) => ({ ...t })) } : undefined,
      },
      include: { tasks: true },
    });
    return t;
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.templateTask.deleteMany({ where: { templateId: id } }),
    prisma.template.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
