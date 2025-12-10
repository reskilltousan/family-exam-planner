"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Apple, CalendarDays, Github, LogIn, UserRoundCheck } from "lucide-react";

export default function AuthPage() {
  const [message] = useState("");

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm">
              <CalendarDays className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">Family Planner Auth</div>
              <div className="text-xs text-zinc-500">新規作成 / ログイン</div>
            </div>
          </div>
          <Link
            href="/"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            トップへ戻る
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8">
        {message && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            {message}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <UserRoundCheck className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-sm font-semibold">familyを新規作成</div>
                <div className="text-xs text-zinc-500">Google または Apple でサインイン</div>
              </div>
            </div>
            <div className="space-y-3 pt-3">
              <button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              >
                <LogIn className="h-4 w-4" strokeWidth={1.5} />
                Googleでサインイン
              </button>
              <button
                onClick={() => signIn("apple", { callbackUrl: "/" })}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              >
                <Apple className="h-4 w-4" strokeWidth={1.5} />
                Appleでサインイン
              </button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800">
                <LogIn className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-sm font-semibold">GitHubでサインイン</div>
                <div className="text-xs text-zinc-500">開発用・サンドボックス</div>
              </div>
            </div>
            <div className="space-y-3 pt-3">
              <button
                onClick={() => signIn("github", { callbackUrl: "/" })}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              >
                <Github className="h-4 w-4" strokeWidth={1.5} />
                GitHubでサインイン
              </button>
              <div className="text-xs text-zinc-500">
                * Google/Apple が使えない場合の開発向け導線です。環境変数で設定が必要です。
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CalendarDays className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-sm font-semibold">Cookieから復元</div>
              <div className="text-xs text-zinc-500">既にログイン済みなら familyId を復元します</div>
            </div>
          </div>
          <button
            onClick={() => signIn(undefined, { callbackUrl: "/" })}
            className="mt-3 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            プロバイダを選択してサインイン
          </button>
        </Card>
      </main>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      {children}
    </div>
  );
}
