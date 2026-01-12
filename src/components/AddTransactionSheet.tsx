"use client";

import { useState } from "react";
import { enqueueTransaction } from "@/lib/offline/queue";

export function AddTransactionSheet({ walletId }: { walletId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [txnType, setTxnType] = useState<"expense" | "income">("expense");
  const [wantsVsNeeds, setWantsVsNeeds] = useState<"want" | "need">("need");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Amount must be a positive number.");
      setLoading(false);
      return;
    }

    const payload = {
      clientId: crypto.randomUUID(),
      walletId,
      date: new Date().toISOString(),
      description: description.trim() || "(no description)",
      amount: Math.round(amt),
      txnType,
      wantsVsNeeds,
    };

    const res = await fetch("/api/transactions/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    setLoading(false);

    if (!res || !res.ok) {
      await enqueueTransaction(payload).catch(() => null);
      setError("Queued offline. It will sync when online.");
      return;
    }

    setOpen(false);
    window.location.reload();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        Add transaction
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => (loading ? null : setOpen(false))}
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">New transaction</div>
              <button
                type="button"
                className="text-sm text-zinc-600 dark:text-zinc-400"
                onClick={() => (loading ? null : setOpen(false))}
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Description</span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-11 rounded-xl border border-zinc-200 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:focus:ring-zinc-50/15"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Amount (₹)</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="numeric"
                  className="h-11 rounded-xl border border-zinc-200 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:focus:ring-zinc-50/15"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Type</span>
                  <select
                    value={txnType}
                    onChange={(e) =>
                      setTxnType(e.target.value as "expense" | "income")
                    }
                    className="h-11 rounded-xl border border-zinc-200 bg-transparent px-3 outline-none dark:border-zinc-800"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Want/Need</span>
                  <select
                    value={wantsVsNeeds}
                    onChange={(e) =>
                      setWantsVsNeeds(e.target.value as "want" | "need")
                    }
                    className="h-11 rounded-xl border border-zinc-200 bg-transparent px-3 outline-none dark:border-zinc-800"
                  >
                    <option value="need">Need</option>
                    <option value="want">Want</option>
                  </select>
                </label>
              </div>

              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : null}

              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

