import { NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/highschool-scraper";
import { parseChibaSchools } from "@/lib/highschool-parser";

const URLS: Record<string, string> = {
  high: "https://chibashigaku.jp/hs/school_type/school_phs/",
  junior: "https://chibashigaku.jp/hs/school_type/school_pjhs/",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level") === "high" ? "high" : "junior";
  const target = URLS[level];
  const res = await fetchWithCache({ url: target });
  if (res.status !== 200) {
    return NextResponse.json({ status: res.status, error: res.error ?? "fetch failed" }, { status: 502 });
  }
  const schools = parseChibaSchools(res.body, level === "high" ? "高等学校" : "中学校");
  return NextResponse.json({
    source: target,
    level,
    count: schools.length,
    schools,
    etag: res.etag ?? null,
    lastModified: res.lastModified ?? null,
  });
}
