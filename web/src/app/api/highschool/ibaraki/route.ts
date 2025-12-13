import { NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/highschool-scraper";
import { parseIbarakiSchools } from "@/lib/highschool-parser";

const TARGET = "https://ibaraki-shigaku.jp/index.php/gakkousyoukai/";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level");
  const res = await fetchWithCache({ url: TARGET });
  if (res.status !== 200) {
    return NextResponse.json({ status: res.status, error: res.error ?? "fetch failed" }, { status: 502 });
  }
  let schools = parseIbarakiSchools(res.body);
  if (level === "high") {
    schools = schools.filter((s) => s.category?.includes("高"));
  } else if (level === "junior") {
    schools = schools.filter((s) => s.category?.includes("中"));
  }
  return NextResponse.json({
    source: TARGET,
    level: level ?? null,
    count: schools.length,
    schools,
    etag: res.etag ?? null,
    lastModified: res.lastModified ?? null,
  });
}
