"use client";

import { useEffect, useMemo, useState } from "react";

type School = {
  name: string;
  website: string | null;
  area: string | null;
  category: string | null;
  attributes: string[];
  address?: string | null;
  phone?: string | null;
};

type ExamEntry = {
  id: string;
  course: string;
  kind: string; // 一般/推薦/併願/専願 など自由入力
  applyStart: string | null;
  applyEnd: string | null;
  examDate: string | null;
  resultDate: string | null;
  procedureDeadline: string | null;
  noteUrl: string | null;
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
  const [examModal, setExamModal] = useState<{ open: boolean; school: School | null }>({ open: false, school: null });
  const [examData, setExamData] = useState<Record<string, ExamEntry[]>>({});

  useEffect(() => {
    const raw = localStorage.getItem("hsFavorites");
    if (raw) {
      try {
        setFavorites(JSON.parse(raw));
      } catch {
        setFavorites({});
      }
    }
    const examRaw = localStorage.getItem("hsExamEntries");
    if (examRaw) {
      try {
        setExamData(JSON.parse(examRaw));
      } catch {
        setExamData({});
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

  function getExamKey(s: School) {
    return `${pref}:${level ?? "all"}:${s.name}`;
  }

  function handleExamSave(key: string, entries: ExamEntry[]) {
    setExamData((prev) => {
      const next = { ...prev, [key]: entries };
      localStorage.setItem("hsExamEntries", JSON.stringify(next));
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
                <button
                  onClick={() => setExamModal({ open: true, school: s })}
                  className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100 hover:bg-blue-100"
                >
                  入試日程を管理
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
      {examModal.open && examModal.school && (
        <ExamModal
          school={examModal.school}
          pref={pref}
          level={level}
          onClose={() => setExamModal({ open: false, school: null })}
          existing={examData[getExamKey(examModal.school)] ?? []}
          onSave={(entries) => {
            handleExamSave(getExamKey(examModal.school!), entries);
            setExamModal({ open: false, school: null });
          }}
        />
      )}
    </div>
  );
}

function ExamModal({
  school,
  pref,
  level,
  existing,
  onClose,
  onSave,
}: {
  school: School;
  pref: string;
  level: "junior" | "high" | null;
  existing: ExamEntry[];
  onClose: () => void;
  onSave: (entries: ExamEntry[]) => void;
}) {
  const [draft, setDraft] = useState<ExamEntry[]>(
    existing.length
      ? existing
      : [
          {
            id: crypto.randomUUID(),
            course: "",
            kind: "",
            applyStart: null,
            applyEnd: null,
            examDate: null,
            resultDate: null,
            procedureDeadline: null,
            noteUrl: null,
          },
        ],
  );

  function update(id: string, patch: Partial<ExamEntry>) {
    setDraft((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
  function addRow() {
    setDraft((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        course: "",
        kind: "",
        applyStart: null,
        applyEnd: null,
        examDate: null,
        resultDate: null,
        procedureDeadline: null,
        noteUrl: null,
      },
    ]);
  }
  function removeRow(id: string) {
    setDraft((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/30 px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl ring-1 ring-zinc-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{school.name} の入試日程</h2>
            <p className="text-sm text-zinc-500">
              {pref} / {level ?? "指定なし"} / 公式サイトは各校ページで確認してください。
            </p>
          </div>
          <button onClick={onClose} className="text-sm font-semibold text-zinc-500 hover:text-zinc-700">
            閉じる
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {draft.map((row) => (
            <div key={row.id} className="rounded-2xl border border-zinc-100 p-3 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <input
                  className="min-w-[140px] flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="コース・区分（例: 普通科 / 国際科）"
                  value={row.course}
                  onChange={(e) => update(row.id, { course: e.target.value })}
                />
                <input
                  className="min-w-[120px] rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="入試種類（例: 推薦A/一般）"
                  value={row.kind}
                  onChange={(e) => update(row.id, { kind: e.target.value })}
                />
                <button
                  onClick={() => removeRow(row.id)}
                  className="rounded-full px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  削除
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <DateField label="願書受付開始" value={row.applyStart} onChange={(v) => update(row.id, { applyStart: v })} />
                <DateField label="願書締切" value={row.applyEnd} onChange={(v) => update(row.id, { applyEnd: v })} />
                <DateField label="試験日" value={row.examDate} onChange={(v) => update(row.id, { examDate: v })} />
                <DateField label="合格発表日" value={row.resultDate} onChange={(v) => update(row.id, { resultDate: v })} />
                <DateField
                  label="入学手続締切"
                  value={row.procedureDeadline}
                  onChange={(v) => update(row.id, { procedureDeadline: v })}
                />
                <input
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="募集要項URL（任意）"
                  value={row.noteUrl ?? ""}
                  onChange={(e) => update(row.id, { noteUrl: e.target.value || null })}
                />
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={addRow}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            >
              行を追加
            </button>
            <button
              onClick={() => onSave(draft)}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-600">
      {label}
      <input
        type="date"
        className="rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </label>
  );
}
