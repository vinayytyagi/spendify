import { formatINR } from "@/lib/money";

export function BudgetBurnRate({
  spentThisMonth,
  monthlyBudget,
}: {
  spentThisMonth: number;
  monthlyBudget: number | null;
}) {
  if (!monthlyBudget || monthlyBudget <= 0) return null;

  const pct = Math.min(100, Math.round((spentThisMonth / monthlyBudget) * 100));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400">
        <span>
          Burn rate: {pct}% ({formatINR(spentThisMonth)} / {formatINR(monthlyBudget)})
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-900">
        <div
          className="h-2 rounded-full bg-zinc-900 dark:bg-zinc-50"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

