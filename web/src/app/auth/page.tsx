"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Apple, CalendarDays, Github, LogIn, Plus, UserPlus, UserRoundCheck } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "" });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [memberInputs, setMemberInputs] = useState<string[]>(["保護者A", "子どもA", "子どもB"]);

  async function handleRegister() {
    if (!registerForm.name.trim() || !registerForm.email.trim() || !registerForm.password.trim()) {
      setMessage("family名・メール・パスワードを入力してください");
      return;
    }
    setLoading(true);
    setMessage("作成中...");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { id: string; name: string; email: string };
      if (typeof window !== "undefined") {
        window.localStorage.setItem("familyId", data.id);
        const memberNames = memberInputs.map((n) => n.trim()).filter(Boolean);
        if (memberNames.length) {
          window.localStorage.setItem("familyMembers", JSON.stringify(memberNames));
        }
      }
      setMessage("familyを作成しました。トップに戻ります。");
      router.push("/");
    } catch (e) {
      const fallbackId = `demo-${Date.now()}`;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("familyId", fallbackId);
        const memberNames = memberInputs.map((n) => n.trim()).filter(Boolean);
        if (memberNames.length) {
          window.localStorage.setItem("familyMembers", JSON.stringify(memberNames));
        }
      }
      setMessage(`API登録に失敗しましたが、ローカルで familyId (${fallbackId}) を設定しました: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setMessage("メール・パスワードを入力してください");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { id: string; name: string; email: string };
      if (typeof window !== "undefined") {
        window.localStorage.setItem("familyId", data.id);
      }
      setMessage("ログインしました。トップに戻ります。");
      router.push("/");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadFromSession() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setMessage("ログイン情報がありません");
        return;
      }
      const data = (await res.json()) as { id: string; name: string; email?: string };
      if (typeof window !== "undefined") {
        window.localStorage.setItem("familyId", data.id);
      }
      setMessage("Cookieからfamilyを復元しました。トップに戻ります。");
      router.push("/");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

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

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <UserPlus className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-sm font-semibold">メールでfamilyを新規作成</div>
                <div className="text-xs text-zinc-500">family名/メール/パスワードとメンバーを登録</div>
              </div>
            </div>
            <div className="space-y-3 pt-3">
              <input
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="family名 / name"
                value={registerForm.name}
                onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
              />
              <input
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="メール"
                value={registerForm.email}
                onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
              />
              <input
                type="password"
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="パスワード"
                value={registerForm.password}
                onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
              />
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                <div className="mb-2 font-semibold text-zinc-800">家族メンバー名（任意）</div>
                <div className="space-y-2">
                  {memberInputs.map((val, idx) => (
                    <input
                      key={idx}
                      className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder={`メンバー${idx + 1}`}
                      value={val}
                      onChange={(e) =>
                        setMemberInputs((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                      }
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setMemberInputs((prev) => [...prev, ""])}
                  className="mt-2 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  メンバーを追加
                </button>
              </div>
              <button
                onClick={handleRegister}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
              >
                <UserRoundCheck className="h-4 w-4" strokeWidth={1.5} />
                自前で作成
              </button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800">
                <LogIn className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-sm font-semibold">メール＋パスワードでログイン</div>
                <div className="text-xs text-zinc-500">既存 family へサインイン</div>
              </div>
            </div>
            <div className="space-y-3 pt-3">
              <input
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="メール"
                value={loginForm.email}
                onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
              />
              <input
                type="password"
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="パスワード"
                value={loginForm.password}
                onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
              />
              <button
                onClick={handleLogin}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
              >
                <LogIn className="h-4 w-4" strokeWidth={1.5} />
                ログイン
              </button>
              <button
                onClick={handleLoadFromSession}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:opacity-90 disabled:opacity-60"
              >
                Cookieから復元
              </button>
            </div>
          </Card>
        </div>
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
