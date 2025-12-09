import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { hashPassword, signSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.family.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "既に登録済みのメールアドレスです" }, { status: 409 });
  }

  const family = await prisma.family.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
    },
    select: { id: true, name: true, email: true },
  });

  const res = NextResponse.json(family, { status: 201 });
  const token = signSession({ familyId: family.id });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return res;
}
