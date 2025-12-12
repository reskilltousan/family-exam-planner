export type FetchMeta = {
  url: string;
  etag?: string;
  lastModified?: string;
};

export type FetchResult =
  | { status: 304; url: string }
  | { status: 200; url: string; body: string; etag?: string | null; lastModified?: string | null }
  | { status: number; url: string; error: string };

export async function fetchWithCache(
  meta: FetchMeta,
  options?: { delayMs?: number },
): Promise<FetchResult> {
  if (typeof fetch === "undefined") return { status: 500, url: meta.url, error: "fetch not available" };
  if (options?.delayMs) await new Promise((r) => setTimeout(r, options.delayMs));

  const headers: Record<string, string> = {};
  if (meta.etag) headers["If-None-Match"] = meta.etag;
  if (meta.lastModified) headers["If-Modified-Since"] = meta.lastModified;

  try {
    const res = await fetch(meta.url, { headers });
    if (res.status === 304) return { status: 304, url: meta.url };
    if (res.status !== 200) return { status: res.status, url: meta.url, error: res.statusText };
    const body = await res.text();
    return { status: 200, url: meta.url, body, etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified") };
  } catch (err) {
    return { status: 500, url: meta.url, error: err instanceof Error ? err.message : "unknown error" };
  }
}
