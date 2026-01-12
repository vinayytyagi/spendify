"use client";

import { useState } from "react";
import { enqueueTransaction } from "@/lib/offline/queue";

export type QuickAddItem = {
  id: string;
  label: string;
  amount: number;
  walletId: string;
  txnType: "expense" | "income";
  wantsVsNeeds: "want" | "need";
};

export function QuickAddBar({ items }: { items: QuickAddItem[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(item: QuickAddItem) {
    setLoadingId(item.id);
    setError(null);

    const payload = {
      clientId: crypto.randomUUID(),
      walletId: item.walletId,
      date: new Date().toISOString(),
      description: item.label,
      amount: item.amount,
      txnType: item.txnType,
      wantsVsNeeds: item.wantsVsNeeds,
    };

    const res = await fetch("/api/transactions/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    setLoadingId(null);

    if (!res || !res.ok) {
      await enqueueTransaction(payload).catch(() => null);
      setError("Queued offline. It will sync when online.");
      return;
    }

    // Refresh wallet page
    window.location.reload();
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Quick add</div>
        {error ? (
          <div className="text-xs text-zinc-600 dark:text-zinc-400">{error}</div>
        ) : null}
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {items.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => add(q)}
            disabled={loadingId === q.id}
            className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium shadow-sm disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950"
          >
            {q.label} ₹{q.amount}
          </button>
        ))}
      </div>
    </div>
  );
}

