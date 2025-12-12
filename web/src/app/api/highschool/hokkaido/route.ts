import { NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/highschool-scraper";
import { parseHokkaidoSchools } from "@/lib/highschool-parser";

const TARGET = "https://www.doshigaku.jp/search/";

export async function GET() {
  const res = await fetchWithCache({ url: TARGET });
  if (res.status !== 200) {
    return NextResponse.json({ status: res.status, error: res.error ?? "fetch failed" }, { status: 502 });
  }
  const schools = parseHokkaidoSchools(res.body);
  return NextResponse.json({
    source: TARGET,
    count: schools.length,
    schools,
    etag: res.etag ?? null,
    lastModified: res.lastModified ?? null,
  });
}
