import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getFamilyId } from "@/lib/family";

type AttachmentBody = {
  targetType?: string;
  targetId?: string;
  name?: string;
  url?: string;
  driveFileId?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

export async function GET(req: NextRequest) {
  const familyId = getFamilyId(req);
  if (!familyId) return NextResponse.json({ error: "familyId is required" }, { status: 400 });

  const url = new URL(req.url);
  const targetId = url.searchParams.get("targetId");
  const targetType = url.searchParams.get("targetType");

  const attachments = await prisma.attachment.findMany({
    where: {
      familyId,
      ...(targetId ? { targetId } : {}),
      ...(targetType ? { targetType } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ count: attachments.length, attachments });
}

export async function POST(req: NextRequest) {
  const familyId = getFamilyId(req);
  if (!familyId) return NextResponse.json({ error: "familyId is required" }, { status: 400 });

  let body: AttachmentBody;
  try {
    body = (await req.json()) as AttachmentBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body.targetType || !body.targetId || !body.name || !body.url) {
    return NextResponse.json({ error: "targetType, targetId, name, url are required" }, { status: 400 });
  }

  const created = await prisma.attachment.create({
    data: {
      familyId,
      targetType: body.targetType,
      targetId: body.targetId,
      name: body.name,
      url: body.url,
      driveFileId: body.driveFileId ?? null,
      mimeType: body.mimeType ?? null,
      size: body.size ?? null,
      createdBy: null,
    },
  });

  return NextResponse.json({ attachment: created });
}
