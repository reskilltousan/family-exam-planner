import { NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/highschool-scraper";
import { parseSaitamaSchools } from "@/lib/highschool-parser";

const TARGET = "https://saitamashigaku.com/pages/6/";

export async function GET() {
  const res = await fetchWithCache({ url: TARGET });
  if (res.status !== 200) {
    return NextResponse.json({ status: res.status, error: res.error ?? "fetch failed" }, { status: 502 });
  }
  const schools = parseSaitamaSchools(res.body);
  return NextResponse.json({
    source: TARGET,
    count: schools.length,
    schools,
    etag: res.etag ?? null,
    lastModified: res.lastModified ?? null,
  });
}
