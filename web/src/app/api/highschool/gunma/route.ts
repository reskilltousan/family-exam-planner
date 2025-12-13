import { NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/highschool-scraper";
import { parseGunmaSchools } from "@/lib/highschool-parser";

const TARGET = "https://www.pref.gunma.jp/page/3563.html";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level") === "junior" ? "junior" : "high";

  const res = await fetchWithCache({ url: TARGET });
  if (res.status !== 200) {
    return NextResponse.json({ status: res.status, error: res.error ?? "fetch failed" }, { status: 502 });
  }
  const schools = parseGunmaSchools(res.body, level);
  return NextResponse.json({
    source: TARGET,
    level,
    count: schools.length,
    schools,
    etag: res.etag ?? null,
    lastModified: res.lastModified ?? null,
  });
}
