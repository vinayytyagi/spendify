"use client";

import { useEffect, useState } from "react";
import { queuedTransactionCount } from "@/lib/offline/queue";
import { syncQueuedTransactions } from "@/lib/offline/sync";

export function OfflineSyncer() {
  const [count, setCount] = useState<number>(0);

  async function refreshCount() {
    const c = await queuedTransactionCount().catch(() => 0);
    setCount(c);
  }

  useEffect(() => {
    let interval: number | undefined;

    const run = async () => {
      await syncQueuedTransactions().catch(() => null);
      await refreshCount();
    };

    run();

    const onOnline = () => void run();
    window.addEventListener("online", onOnline);

    interval = window.setInterval(() => void run(), 15000);

    return () => {
      window.removeEventListener("online", onOnline);
      if (interval) window.clearInterval(interval);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto w-full max-w-md px-4 pt-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
          {count} queued change(s) pending sync. Open the app online to sync.
        </div>
      </div>
    </div>
  );
}

