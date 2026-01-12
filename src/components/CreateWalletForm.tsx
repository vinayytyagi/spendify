"use client";

import { useState } from "react";

export function CreateWalletForm() {
  const [name, setName] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const budgetNum =
      monthlyBudget.trim() === "" ? null : Number(monthlyBudget.trim());
    if (budgetNum !== null && (!Number.isFinite(budgetNum) || budgetNum <= 0)) {
      setError("Budget must be a positive number (or empty).");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        monthlyBudget: budgetNum === null ? null : Math.round(budgetNum),
      }),
    }).catch(() => null);

    setLoading(false);

    if (!res || !res.ok) {
      setError("Failed (or offline).");
      return;
    }

    setName("");
    setMonthlyBudget("");
    window.location.reload();
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Wallet name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-11 rounded-xl border border-zinc-200 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:focus:ring-zinc-50/15"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Monthly budget (₹)
          </span>
          <input
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            inputMode="numeric"
            className="h-11 rounded-xl border border-zinc-200 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:focus:ring-zinc-50/15"
          />
        </label>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {loading ? "Creating..." : "Create wallet"}
      </button>
    </form>
  );
}

