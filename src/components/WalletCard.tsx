import Link from "next/link";
import { formatINR } from "@/lib/money";
import { BudgetBurnRate } from "@/components/BudgetBurnRate";

export function WalletCard({
  id,
  name,
  balance,
  spentThisMonth,
  monthlyBudget,
}: {
  id: string;
  name: string;
  balance: number;
  spentThisMonth: number;
  monthlyBudget: number | null;
}) {
  return (
    <Link
      href={`/w/${id}`}
      className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            Balance
          </div>
        </div>
        <div className="text-right text-lg font-semibold tabular-nums">
          {formatINR(balance)}
        </div>
      </div>

      <div className="mt-3">
        <BudgetBurnRate spentThisMonth={spentThisMonth} monthlyBudget={monthlyBudget} />
      </div>
    </Link>
  );
}

