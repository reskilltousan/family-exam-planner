import { NextRequest } from "next/server";

export function getFamilyId(req: NextRequest): string | null {
  const headerId = req.headers.get("x-family-id");
  if (headerId) return headerId;

  const url = new URL(req.url);
  const queryId = url.searchParams.get("familyId");
  if (queryId) return queryId;

  const envId = process.env.DEFAULT_FAMILY_ID;
  return envId ?? null;
}
