import { NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/highschool-scraper";
import { parseKanagawaSchools } from "@/lib/highschool-parser";

const URLS: Record<string, string> = {
  junior: "https://phsk.or.jp/school/division/junior/",
  high: "https://phsk.or.jp/school/division/high/",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level") === "high" ? "high" : "junior";
  const target = URLS[level];

  const res = await fetchWithCache({ url: target });
  if (res.status !== 200) {
    return NextResponse.json({ status: res.status, error: res.error ?? "fetch failed" }, { status: 502 });
  }
  const schools = parseKanagawaSchools(res.body, level === "high" ? "高等学校" : "中学校");
  return NextResponse.json({
    source: target,
    level,
    count: schools.length,
    schools,
    etag: res.etag ?? null,
    lastModified: res.lastModified ?? null,
  });
}
