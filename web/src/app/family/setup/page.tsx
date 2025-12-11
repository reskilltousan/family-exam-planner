"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Clock3, Mail, Palette, Plus, Save, Trash2, UserRound } from "lucide-react";

type Member = {
  id: string;
  name: string;
  role: "parent" | "student" | "support";
  color: string;
};

const roleOptions: { value: Member["role"]; label: string }[] = [
  { value: "parent", label: "保護者" },
  { value: "student", label: "子ども" },
  { value: "support", label: "サポーター" },
];

const colorPalette = ["#2563eb", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#14b8a6", "#ec4899", "#0ea5e9"];

function makeMember(name: string, idx: number): Member {
  return {
    id: `${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 8)}`,
    name,
    role: idx === 0 ? "parent" : "student",
    color: colorPalette[idx % colorPalette.length],
  };
}

export default function FamilySetupPage() {
  const router = useRouter();
  const [familyId, setFamilyId] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [timezone, setTimezone] = useState("Asia/Tokyo");
  const [members, setMembers] = useState<Member[]>([
    makeMember("保護者A", 0),
    makeMember("子どもA", 1),
    makeMember("子どもB", 2),
  ]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const timezoneOptions = useMemo(() => {
    const current = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Tokyo";
    const base = ["Asia/Tokyo", "Asia/Seoul", "America/Los_Angeles", "America/New_York", "Europe/London", "Europe/Paris"];
    const unique = Array.from(new Set([current, ...base].filter(Boolean)));
    return unique;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fid = window.localStorage.getItem("familyId") || "";
    const fname = window.localStorage.getItem("familyName") || "";
    const cEmail = window.localStorage.getItem("familyContact") || "";
    const tz = window.localStorage.getItem("familyTimezone") || "";
    const detailedRaw = window.localStorage.getItem("familyMembersDetailed");
    const simpleRaw = window.localStorage.getItem("familyMembers");

    if (fid) queueMicrotask(() => setFamilyId(fid));
    if (fname) queueMicrotask(() => setFamilyName(fname));
    if (cEmail) queueMicrotask(() => setContactEmail(cEmail));
    if (tz) queueMicrotask(() => setTimezone(tz));

    if (detailedRaw) {
      try {
        const parsed = (JSON.parse(detailedRaw) as Member[]).filter((m) => m && m.name);
        if (parsed.length) queueMicrotask(() => setMembers(parsed));
      } catch {
        /* ignore */
      }
    } else if (simpleRaw) {
      try {
        const parsed = (JSON.parse(simpleRaw) as string[]).filter(Boolean);
        if (parsed.length) {
          const hydrated = parsed.map((name, idx) => makeMember(name, idx));
          queueMicrotask(() => setMembers(hydrated));
        }
      } catch {
        /* ignore */
      }
    }
  }, []);

  function updateMember(id: string, patch: Partial<Member>) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function addMember() {
    setMembers((prev) => [...prev, makeMember(`メンバー${prev.length + 1}`, prev.length)]);
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function handleSave() {
    setError("");
    const cleanMembers = members
      .map((m) => ({ ...m, name: m.name.trim() }))
      .filter((m) => m.name.length > 0);

    if (!familyId.trim()) {
      setError("familyIdを入力してください。");
      return;
    }
    if (!cleanMembers.length) {
      setError("家族メンバーを1人以上登録してください。");
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem("familyId", familyId.trim());
      window.localStorage.setItem("familyName", familyName.trim());
      window.localStorage.setItem("familyContact", contactEmail.trim());
      window.localStorage.setItem("familyTimezone", timezone);
      window.localStorage.setItem("familyMembersDetailed", JSON.stringify(cleanMembers));
      window.localStorage.setItem(
        "familyMembers",
        JSON.stringify(cleanMembers.map((m) => m.name)),
      );
    }
    setMessage("家族設定を保存しました。トップに戻ります。");
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200/60 bg-white/80 px-6 py-5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Family Settings</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-3xl font-bold tracking-tight">家族設定</h1>
            <Link
              href="/signin"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              サインインに戻る
            </Link>
          </div>
          <p className="text-sm text-zinc-500">
            familyId: <span className="font-semibold text-zinc-700">{familyId || "未設定"}</span>
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        {message && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 rounded-3xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-zinc-100 lg:col-span-2">
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
              <h2 className="text-lg font-semibold">家族情報</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-zinc-700">
                <span className="text-xs text-zinc-500">familyId（必須）</span>
                <input
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  value={familyId}
                  onChange={(e) => {
                    setFamilyId(e.target.value);
                    if (typeof window !== "undefined") window.localStorage.setItem("familyId", e.target.value);
                  }}
                  placeholder="例: family-12345"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-zinc-700">
                <span className="text-xs text-zinc-500">家族名</span>
                <input
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="例: 佐藤家"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-zinc-700">
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Mail className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                  連絡先メール（通知先）
                </span>
                <input
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-zinc-700">
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Clock3 className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                  タイムゾーン
                </span>
                <select
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  {timezoneOptions.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-3xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-zinc-100">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-amber-600" strokeWidth={1.5} />
                <h2 className="text-lg font-semibold">保存</h2>
              </div>
              <p className="text-sm text-zinc-500">
                家族IDとメンバーはローカルに保存され、トップページやカレンダーに即時反映されます。
              </p>
            </div>
            <button
              onClick={handleSave}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Save className="h-4 w-4" strokeWidth={1.5} />
              保存してトップへ
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-zinc-100">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
              <div>
                <h2 className="text-lg font-semibold">家族メンバー</h2>
                <p className="text-sm text-zinc-500">役割・カラーを設定し、複数人を登録できます。</p>
              </div>
            </div>
            <button
              type="button"
              onClick={addMember}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              メンバーを追加
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-full border border-zinc-200"
                      style={{ backgroundColor: member.color }}
                    />
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                      value={member.name}
                      onChange={(e) => updateMember(member.id, { name: e.target.value })}
                      placeholder="氏名"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-rose-500"
                    aria-label="削除"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs font-semibold text-zinc-600">
                    役割
                    <select
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                      value={member.role}
                      onChange={(e) => updateMember(member.id, { role: e.target.value as Member["role"] })}
                    >
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-zinc-600">
                    カラー
                    <div className="flex flex-wrap gap-2">
                      {colorPalette.map((color) => {
                        const isActive = member.color === color;
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => updateMember(member.id, { color })}
                            className={`h-7 w-7 rounded-full border ${isActive ? "ring-2 ring-offset-2 ring-blue-500" : "border-zinc-200"}`}
                            style={{ backgroundColor: color }}
                            aria-label={`色 ${color}`}
                          />
                        );
                      })}
                    </div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
