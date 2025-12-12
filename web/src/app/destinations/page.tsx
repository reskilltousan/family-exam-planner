"use client";

import Link from "next/link";
import { useState } from "react";

const tabs = [
  { key: "jr", label: "中学受験" },
  { key: "high", label: "高校受験" },
  { key: "univ", label: "大学受験" },
  { key: "grad", label: "大学院受験" },
];

export default function DestinationsPage() {
  const [tab, setTab] = useState("high");

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 font-sans text-zinc-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-2 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">受験先登録</h1>
            <p className="text-sm text-zinc-500">学校を選んで入試日程をメモし、トップのイベントに反映します。</p>
            <Link href="/" className="ml-auto rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90">
              トップに戻る
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${
                  tab === t.key ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          {tab === "jr" && (
            <TabCard
              title="中学受験"
              description="私立中学の一覧・入試メモは高校一覧ページと共通UIで管理します。まずは学校をお気に入り登録し、入試日程をメモしてください。"
              actions={[{ label: "学校一覧へ（中学）", href: "/highschools?level=junior" }]}
            />
          )}

          {tab === "high" && (
            <TabCard
              title="高校受験"
              description="学校一覧ページでお気に入り登録＋入試日程メモ。保存するとトップ画面のイベントに反映されます。"
              actions={[{ label: "学校一覧へ（高校/中学切替可）", href: "/highschools" }]}
            />
          )}

          {tab === "univ" && (
            <TabCard
              title="大学受験"
              description="Passnavi風の大学受験情報を表示します。お気に入り/日程メモは今後拡張予定です。"
              actions={[{ label: "大学受験情報へ", href: "/exam" }]}
            />
          )}

          {tab === "grad" && (
            <TabCard
              title="大学院受験"
              description="まだ情報源を接続していません。必要な大学院をお気に入りメモ（暫定）で管理する計画です。"
              actions={[]}
              note="大学院については情報ソース検討中です。"
            />
          )}
        </section>
      </div>
    </div>
  );
}

function TabCard({
  title,
  description,
  actions,
  note,
}: {
  title: string;
  description: string;
  actions: { label: string; href: string }[];
  note?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="text-sm text-zinc-500">{description}</p>
        {note && <p className="text-xs text-zinc-500 mt-1">{note}</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            {a.label}
          </Link>
        ))}
        {!actions.length && <span className="text-xs text-zinc-500">準備中</span>}
      </div>
    </div>
  );
}
