"use client";

import { useEffect, useMemo, useState } from "react";

type School = {
  name: string;
  website: string | null;
  area: string | null;
  category: string | null;
  attributes: string[];
};

const PREFS: { value: string; label: string; levels: ("junior" | "high" | null)[] }[] = [
  { value: "hokkaido", label: "北海道", levels: [null] },
  { value: "tokyo", label: "東京", levels: ["junior", "high"] },
  { value: "saitama", label: "埼玉", levels: [null] },
  { value: "chiba", label: "千葉", levels: ["junior", "high"] },
];

function buildUrl(pref: string, level: "junior" | "high" | null) {
  switch (pref) {
    case "tokyo":
    case "chiba":
      return `/api/highschool/${pref}?level=${level ?? "junior"}`;
    default:
      return `/api/highschool/${pref}`;
  }
}

export default function HighschoolPage() {
  const [pref, setPref] = useState<string>(PREFS[0].value);
  const [level, setLevel] = useState<"junior" | "high" | null>(PREFS[0].levels[0]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("hsFavorites");
    if (raw) {
      try {
        setFavorites(JSON.parse(raw));
      } catch {
        setFavorites({});
      }
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = buildUrl(pref, level);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const data = await res.json();
        const list = (data?.schools as School[]) ?? [];
        setSchools(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : "unknown error");
        setSchools([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [pref, level]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return schools;
    return schools.filter((s) => s.name.toLowerCase().includes(k));
  }, [keyword, schools]);

  function toggleFavorite(name: string) {
    const key = `${pref}:${level ?? "all"}:${name}`;
    setFavorites((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("hsFavorites", JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 font-sans text-zinc-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <header className="flex flex-col gap-2 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">学校リスト（受験タスク連携用）</h1>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
              お気に入り＝タスク連携候補
            </span>
          </div>
          <p className="text-sm text-zinc-500">
            学校名と公式サイト/詳細ページのみを扱います。詳細は各校サイトで確認してください。
          </p>
          <div className="flex flex-wrap gap-3">
            <select
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              value={pref}
              onChange={(e) => {
                const p = e.target.value;
                setPref(p);
                const found = PREFS.find((x) => x.value === p);
                setLevel(found?.levels[0] ?? null);
              }}
            >
              {PREFS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {PREFS.find((p) => p.value === pref)?.levels.length === 2 && (
              <select
                className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                value={level ?? "junior"}
                onChange={(e) => setLevel(e.target.value === "high" ? "high" : "junior")}
              >
                <option value="junior">中学</option>
                <option value="high">高校</option>
              </select>
            )}
            <input
              className="min-w-[180px] flex-1 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="学校名で検索"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </header>

        <main className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          {loading && <p className="text-sm text-zinc-500">読み込み中...</p>}
          {error && <p className="text-sm text-rose-600">取得エラー: {error}</p>}
          {!loading && !error && (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold text-zinc-500">全 {filtered.length} 校</div>
              <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100">
                {filtered.map((s) => {
                  const favKey = `${pref}:${level ?? "all"}:${s.name}`;
                  const isFav = favorites[favKey];
                  return (
                    <div key={favKey} className="flex flex-col gap-1 px-4 py-3 hover:bg-zinc-50">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-900">{s.name}</span>
                          {s.area && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                              {s.area}
                            </span>
                          )}
                          {s.category && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                              {s.category}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleFavorite(s.name)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                            isFav ? "bg-amber-500 text-white" : "bg-zinc-900 text-white"
                          } hover:opacity-90`}
                        >
                          {isFav ? "お気に入り済み" : "お気に入りに追加"}
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        {s.attributes.map((a) => (
                          <span key={a} className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-600">
                            {a}
                          </span>
                        ))}
                        {s.website && (
                          <a
                            className="text-blue-600 hover:text-blue-700"
                            href={s.website}
                            target="_blank"
                            rel="noreferrer"
                          >
                            サイトを見る
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!filtered.length && <p className="px-4 py-6 text-sm text-zinc-500">該当する学校がありません</p>}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
