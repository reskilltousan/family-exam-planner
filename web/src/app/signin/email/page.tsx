"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";

export default function EmailSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setMessage("メールアドレスとパスワードを入力してください");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { id: string };
      if (typeof window !== "undefined") {
        window.localStorage.setItem("familyId", data.id);
      }
      router.push("/");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">
      <header className="flex flex-col items-center gap-3 px-6 py-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">メールアドレスで続行</h1>
        <p className="text-sm text-zinc-500">familyアカウントにメールとパスワードでログイン</p>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-4 px-6 pb-12">
        <div className="space-y-3 rounded-3xl border border-zinc-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-600">メール</label>
            <input
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-600">パスワード</label>
            <input
              type="password"
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {message && (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">{message}</div>
          )}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" strokeWidth={1.5} />
            ログイン
          </button>
          <Link
            href="/signin"
            className="block text-center text-xs font-semibold text-blue-600 underline hover:text-blue-700"
          >
            他の方法でサインイン
          </Link>
          <Link href="/reset" className="block text-center text-xs text-zinc-500 underline hover:text-zinc-700">
            パスワードを忘れた場合
          </Link>
        </div>
      </main>
    </div>
  );
}
