import { NextRequest, NextResponse } from "next/server";
import { getFamilyId } from "@/lib/family";
import { uploadDriveFile } from "@/lib/google";
import prisma from "@/lib/db";

type Body = {
  name?: string;
  mimeType?: string;
  data?: string; // base64
  targetType?: string;
  targetId?: string;
};

export async function POST(req: NextRequest) {
  const familyId = getFamilyId(req);
  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body.name || !body.data) {
    return NextResponse.json({ error: "name and data are required" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(body.data, "base64");
    const file = await uploadDriveFile(familyId, { name: body.name, mimeType: body.mimeType, data: buffer });
    const attachment =
      body.targetType && body.targetId
        ? await prisma.attachment.create({
            data: {
              familyId,
              targetType: body.targetType,
              targetId: body.targetId,
              name: body.name,
              url: file.webViewLink ?? file.webContentLink ?? "",
              driveFileId: file.id,
              mimeType: file.mimeType ?? null,
              size: file.size ?? null,
            },
          })
        : null;
    return NextResponse.json({ file, attachment });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
