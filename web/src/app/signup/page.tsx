"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Apple, Github, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRegister() {
    if (!familyName.trim() || !email.trim() || !password.trim()) {
      setMessage("family名・メール・パスワードを入力してください");
      return;
    }
    setLoading(true);
    setMessage("登録中...");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: familyName, email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { id: string };
      if (typeof window !== "undefined") {
        window.localStorage.setItem("familyId", data.id);
      }
      router.push("/family/setup");
    } catch (e) {
      const fallbackId = `demo-${Date.now()}`;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("familyId", fallbackId);
      }
      setMessage(`API登録に失敗しましたが、仮 familyId (${fallbackId}) をセットしました: ${(e as Error).message}`);
      router.push("/family/setup");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">
      <header className="flex flex-col items-center gap-2 px-6 py-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Family Planner に新規登録</h1>
        <p className="text-sm text-zinc-500">外部ログインか、メールで最速登録</p>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-4 px-6 pb-12">
        {message && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            {message}
          </div>
        )}

        <AuthButton
          icon={<LogIn className="h-5 w-5" strokeWidth={1.5} />}
          label="Google で登録"
          onClick={() => signIn("google", { callbackUrl: "/family/setup" })}
          tone="google"
        />
        <AuthButton
          icon={<Apple className="h-5 w-5" strokeWidth={1.5} />}
          label="Apple で登録"
          onClick={() => signIn("apple", { callbackUrl: "/family/setup" })}
          tone="apple"
        />
        <AuthButton
          icon={<Github className="h-5 w-5" strokeWidth={1.5} />}
          label="GitHub で登録"
          onClick={() => signIn("github", { callbackUrl: "/family/setup" })}
          tone="github"
        />

        <Separator label="または" />

        <div className="space-y-3 rounded-3xl border border-zinc-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-600">family名</label>
            <input
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="例: 山田家"
            />
          </div>
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
              autoComplete="new-password"
            />
          </div>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.5} />
            メールで登録
          </button>
        </div>

        <div className="text-center text-sm text-zinc-600">
          すでにアカウントをお持ちですか？{" "}
          <Link href="/signin" className="font-semibold text-blue-600 underline hover:text-blue-700">
            サインインへ
          </Link>
        </div>
      </main>
    </div>
  );
}

function AuthButton({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone: "google" | "apple" | "github";
}) {
  const styles =
    tone === "google"
      ? "border border-zinc-200 bg-white text-zinc-900"
      : tone === "apple"
        ? "bg-black text-white"
        : "bg-zinc-800 text-white";
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-sm hover:opacity-90 ${styles}`}
    >
      {icon}
      {label}
    </button>
  );
}

function Separator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-zinc-500">
      <span className="h-px flex-1 bg-zinc-200" />
      {label}
      <span className="h-px flex-1 bg-zinc-200" />
    </div>
  );
}
