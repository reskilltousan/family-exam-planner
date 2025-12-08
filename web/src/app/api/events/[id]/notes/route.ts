import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getFamilyId } from "@/lib/family";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const familyId = getFamilyId(req);
  if (!familyId) return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  const eventId = params.id;
  const event = await prisma.event.findFirst({ where: { id: eventId, familyId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const notes = await prisma.eventNote.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const familyId = getFamilyId(req);
  if (!familyId) return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  const eventId = params.id;
  const event = await prisma.event.findFirst({ where: { id: eventId, familyId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const json = await req.json();
  const content = (json?.content as string | undefined)?.trim();
  if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

  const note = await prisma.eventNote.create({
    data: {
      eventId,
      content,
    },
  });
  return NextResponse.json(note, { status: 201 });
}
