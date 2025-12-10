"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { Apple, Github, LogIn } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">
      <header className="flex flex-col items-center gap-2 px-6 py-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Family Planner にサインイン</h1>
        <p className="text-sm text-zinc-500">Google / Apple / GitHub またはメールアドレスで続行</p>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-4 px-6 pb-12">
        <AuthButton
          icon={<LogIn className="h-5 w-5" strokeWidth={1.5} />}
          label="Google で続行"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          tone="google"
        />
        <AuthButton
          icon={<Apple className="h-5 w-5" strokeWidth={1.5} />}
          label="Apple で続行"
          onClick={() => signIn("apple", { callbackUrl: "/" })}
          tone="apple"
        />
        <AuthButton
          icon={<Github className="h-5 w-5" strokeWidth={1.5} />}
          label="GitHub で続行"
          onClick={() => signIn("github", { callbackUrl: "/" })}
          tone="github"
        />

        <Separator label="または" />

        <Link
          href="/signin/email"
          className="block w-full rounded-full bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          メールアドレスで続行
        </Link>

        <Link href="/" className="text-center text-xs text-blue-600 underline hover:text-blue-700">
          トップへ戻る
        </Link>
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
