"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") ?? "/",
    [searchParams],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!res?.ok) {
      setError("Invalid email or password.");
      return;
    }

    router.push(res.url ?? callbackUrl);
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Welcome back to Spendify.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
              className="h-11 rounded-xl border border-zinc-200 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:focus:ring-zinc-50/15"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              className="h-11 rounded-xl border border-zinc-200 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:focus:ring-zinc-50/15"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </div>
      </form>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Don’t have an account?{" "}
        <Link className="text-zinc-900 underline dark:text-zinc-50" href="/register">
          Create one
        </Link>
        .
      </p>
    </>
  );
}

