import { openDB } from "idb";

export type TransactionUpsertPayload = {
  clientId: string;
  walletId: string;
  date: string; // ISO
  description: string;
  amount: number;
  txnType: "expense" | "income";
  wantsVsNeeds: "want" | "need";
};

type QueuedTxn = TransactionUpsertPayload & {
  createdAt: number;
};

const DB_NAME = "spendify";
const STORE = "txQueue";

async function db() {
  return await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "clientId" });
      }
    },
  });
}

export async function enqueueTransaction(payload: TransactionUpsertPayload) {
  const d = await db();
  const entry: QueuedTxn = { ...payload, createdAt: Date.now() };
  await d.put(STORE, entry);
}

export async function listQueuedTransactions(): Promise<QueuedTxn[]> {
  const d = await db();
  return await d.getAll(STORE);
}

export async function removeQueuedTransaction(clientId: string) {
  const d = await db();
  await d.delete(STORE, clientId);
}

export async function queuedTransactionCount(): Promise<number> {
  const d = await db();
  return await d.count(STORE);
}

