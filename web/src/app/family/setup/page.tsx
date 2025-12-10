"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Save } from "lucide-react";

export default function FamilySetupPage() {
  const router = useRouter();
  const [familyId, setFamilyId] = useState("");
  const [members, setMembers] = useState<string[]>(["保護者A", "子どもA", "子どもB"]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fid = window.localStorage.getItem("familyId") || "";
    if (fid) queueMicrotask(() => setFamilyId(fid));
    const raw = window.localStorage.getItem("familyMembers");
    if (raw) {
      try {
        const arr = (JSON.parse(raw) as string[]).filter(Boolean);
        if (arr.length) queueMicrotask(() => setMembers(arr));
      } catch {
        /* ignore */
      }
    }
  }, []);

  function handleSave() {
    if (typeof window !== "undefined") {
      const clean = members.map((m) => m.trim()).filter(Boolean);
      if (clean.length) {
        window.localStorage.setItem("familyMembers", JSON.stringify(clean));
      }
    }
    setMessage("家族メンバーを保存しました。トップに戻ります。");
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">
      <header className="flex flex-col items-center gap-2 px-6 py-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">家族メンバーを登録</h1>
        <p className="text-sm text-zinc-500">familyId: {familyId || "未設定"} / 家族の氏名を入力してください</p>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-4 px-6 pb-12">
        {message && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            {message}
          </div>
        )}

        <div className="space-y-3 rounded-3xl border border-zinc-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-600">familyId</label>
            <input
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={familyId}
              onChange={(e) => {
                setFamilyId(e.target.value);
                if (typeof window !== "undefined") window.localStorage.setItem("familyId", e.target.value);
              }}
            />
          </div>
          <div className="text-xs font-semibold text-zinc-600">家族メンバー</div>
          <div className="space-y-2">
            {members.map((val, idx) => (
              <input
                key={idx}
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder={`メンバー${idx + 1}`}
                value={val}
                onChange={(e) => setMembers((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMembers((prev) => [...prev, ""])}
            className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            メンバーを追加
          </button>
          <button
            onClick={handleSave}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Save className="h-4 w-4" strokeWidth={1.5} />
            保存してトップへ
          </button>
          <Link href="/signin" className="block text-center text-xs font-semibold text-blue-600 underline hover:text-blue-700">
            サインインに戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
