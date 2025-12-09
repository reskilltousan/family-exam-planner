import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { signSession, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const family = await prisma.family.findUnique({ where: { email } });
  if (!family || !family.passwordHash) {
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }

  if (!verifyPassword(password, family.passwordHash)) {
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }

  const res = NextResponse.json({ id: family.id, name: family.name, email: family.email });
  const token = signSession({ familyId: family.id });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
