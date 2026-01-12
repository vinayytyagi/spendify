import {
  listQueuedTransactions,
  removeQueuedTransaction,
  type TransactionUpsertPayload,
} from "@/lib/offline/queue";

export async function syncQueuedTransactions() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const queued = await listQueuedTransactions();
  if (queued.length === 0) return;

  for (const q of queued) {
    const payload: TransactionUpsertPayload = {
      clientId: q.clientId,
      walletId: q.walletId,
      date: q.date,
      description: q.description,
      amount: q.amount,
      txnType: q.txnType,
      wantsVsNeeds: q.wantsVsNeeds,
    };

    const res = await fetch("/api/transactions/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (res && res.ok) {
      await removeQueuedTransaction(q.clientId);
    } else {
      // Stop on first failure to avoid hammering the network.
      break;
    }
  }
}

