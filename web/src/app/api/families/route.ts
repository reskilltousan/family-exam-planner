import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { familySchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = familySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const family = await prisma.family.create({
    data: {
      name: parsed.data.name,
    },
  });

  return NextResponse.json(family, { status: 201 });
}
