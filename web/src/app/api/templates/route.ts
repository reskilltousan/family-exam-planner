import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

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
