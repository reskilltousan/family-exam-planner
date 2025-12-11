"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Clock, MapPin, Search, University } from "lucide-react";

type ExamSchedule = {
  title: string;
  period: string;
  detail: string;
};

type School = {
  id: string;
  name: string;
  location: string;
  deviation?: string;
  generalExams: ExamSchedule[];
  recommendationExams: ExamSchedule[];
  application: {
    method: string;
    url?: string;
    note?: string;
  };
  examCalendar: ExamSchedule[];
};

const fallbackSchools: School[] = [];

export default function ExamSearchPage() {
  const [keyword, setKeyword] = useState("");
  const [schools, setSchools] = useState<School[]>(fallbackSchools);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/exam", { cache: "no-store" });
        if (!res.ok) throw new Error(`failed: ${res.status}`);
        const data = await res.json();
        if (!active) return;
        const list = (data?.schools as School[] | undefined) ?? [];
        setSchools(list);
        setSelectedId(list[0]?.id ?? null);
      } catch (e) {
        console.error(e);
        if (!active) return;
        setError("データ取得に失敗しました（スタブ表示に切替）");
        setSchools(fallbackSchools);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    if (!lower) return schools;
    return schools.filter((s) => s.name.toLowerCase().includes(lower) || s.location.toLowerCase().includes(lower));
  }, [keyword, schools]);

  const selected = filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200/60 bg-white/90 px-6 py-4 backdrop-blur-lg shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <University className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
            <div>
              <h1 className="text-xl font-bold tracking-tight">大学受験情報（Passnavi 風）</h1>
              <p className="text-sm text-zinc-500">入試日程・推薦・一般・出願情報を素早く確認</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
            <Clock className="h-4 w-4" strokeWidth={1.5} />
            {loading
              ? "読み込み中..."
              : error
              ? "スタブ表示（取得失敗）"
              : "API取得（モック）/ 今後スクレイプ差し替え"}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4 rounded-3xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-zinc-100">
          <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full bg-transparent text-sm text-zinc-800 focus:outline-none"
              placeholder="大学名・地域で検索"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500">検索結果</p>
            <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100 bg-white">
              {loading && <p className="px-3 py-4 text-sm text-zinc-500">読み込み中...</p>}
              {!loading &&
                filtered.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`flex w-full flex-col gap-1 px-3 py-3 text-left hover:bg-blue-50 ${
                      selected?.id === s.id ? "border-l-4 border-blue-500 bg-blue-50/70" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-zinc-900">{s.name}</span>
                      <span className="text-[11px] font-semibold text-blue-600">詳細</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <MapPin className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                      {s.location}
                    </div>
                    {s.deviation && <p className="text-[11px] text-zinc-500">{s.deviation}</p>}
                  </button>
                ))}
              {!loading && !filtered.length && <p className="px-3 py-4 text-sm text-zinc-500">該当する大学がありません</p>}
            </div>
          </div>
        </aside>

        <section className="space-y-4 rounded-3xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-zinc-100">
          {selected ? (
            <div className="space-y-6">
              <header className="space-y-1 border-b border-zinc-100 pb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-tight">{selected.name}</h2>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{selected.location}</span>
                  {selected.deviation && (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {selected.deviation}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-600">入試日程 / 推薦 / 一般 / 出願情報を確認できます。</p>
              </header>

              <InfoBlock title="入試日程" items={selected.examCalendar} />
              <InfoBlock title="推薦試験" items={selected.recommendationExams} />
              <InfoBlock title="一般試験" items={selected.generalExams} />

              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-zinc-500">出願</p>
                    <p className="text-sm font-semibold text-zinc-900">{selected.application.method}</p>
                    {selected.application.note && (
                      <p className="text-xs text-zinc-500">{selected.application.note}</p>
                    )}
                  </div>
                  {selected.application.url && (
                    <a
                      href={selected.application.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      出願ページ
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : loading ? (
            <p className="text-sm text-zinc-500">読み込み中...</p>
          ) : (
            <p className="text-sm text-zinc-500">左の検索結果から大学を選択してください。</p>
          )}
        </section>
      </main>
    </div>
  );
}

function InfoBlock({ title, items }: { title: string; items: ExamSchedule[] }) {
  return (
    <div className="space-y-3 rounded-2xl border border-zinc-100 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChevronDown className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        </div>
        <span className="text-xs text-zinc-500">{items.length}件</span>
      </div>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={`${item.title}-${idx}`}
            className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
          >
            <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
            <p className="text-xs font-semibold text-blue-700">{item.period}</p>
            <p className="text-xs text-zinc-600">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
