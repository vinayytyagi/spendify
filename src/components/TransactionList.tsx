import { formatINR } from "@/lib/money";

export type TransactionListItem = {
  id: string;
  date: Date;
  description: string;
  amount: number;
  txnType: "expense" | "income";
  wantsVsNeeds: "want" | "need";
};

export function TransactionList({ items }: { items: TransactionListItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        No transactions yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {items.map((t) => {
          const sign = t.txnType === "expense" ? "-" : "+";
          const amountColor =
            t.txnType === "expense"
              ? "text-zinc-900 dark:text-zinc-50"
              : "text-emerald-700 dark:text-emerald-400";

          return (
            <li key={t.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="truncate text-sm font-medium">{t.description}</div>
                <div className="flex gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <span>{t.date.toLocaleDateString("en-IN")}</span>
                  <span>•</span>
                  <span className="capitalize">{t.wantsVsNeeds}</span>
                </div>
              </div>
              <div className={`shrink-0 text-sm font-semibold tabular-nums ${amountColor}`}>
                {sign}
                {formatINR(t.amount)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

