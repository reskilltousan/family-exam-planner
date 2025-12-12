import { NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/highschool-scraper";
import { parseTokyoSchools } from "@/lib/highschool-parser";

const URLS: Record<string, string> = {
  junior: "https://www.tokyoshigaku.com/schools/",
  high: "https://www.tokyoshigaku.com/schools/highschool.html",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level") === "high" ? "high" : "junior";
  const target = URLS[level];

  const res = await fetchWithCache({ url: target });
  if (res.status !== 200) {
    return NextResponse.json({ status: res.status, error: res.error ?? "fetch failed" }, { status: 502 });
  }
  const schools = parseTokyoSchools(res.body);
  return NextResponse.json({
    source: target,
    level,
    count: schools.length,
    schools,
    etag: res.etag ?? null,
    lastModified: res.lastModified ?? null,
  });
}
