import { NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/highschool-scraper";
import { parseAssociationTable } from "@/lib/highschool-parser";

const TARGET = "https://chukoren.jp/association/link1/";

export async function GET() {
  const res = await fetchWithCache({ url: TARGET });
  if (res.status !== 200) {
    return NextResponse.json({ status: res.status, error: res.error ?? "fetch failed" }, { status: 502 });
  }
  const rows = parseAssociationTable(res.body);
  return NextResponse.json({
    source: TARGET,
    count: rows.length,
    rows,
    etag: res.etag ?? null,
    lastModified: res.lastModified ?? null,
  });
}
