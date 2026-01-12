import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { WalletCard } from "@/components/WalletCard";
import { SignOutButton } from "@/components/SignOutButton";
import { authOptions } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { prisma } from "@/lib/prisma";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = session.user.id;
  const [wallets, txns] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, monthlyBudget: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      select: { walletId: true, amount: true, txnType: true, wantsVsNeeds: true, date: true },
    }),
  ]);

  const monthStart = startOfMonth(new Date());

  const byWallet = new Map<
    string,
    { balance: number; spentThisMonth: number; wantsThisMonth: number; needsThisMonth: number }
  >();

  for (const w of wallets)
    byWallet.set(w.id, {
      balance: 0,
      spentThisMonth: 0,
      wantsThisMonth: 0,
      needsThisMonth: 0,
    });

  for (const t of txns) {
    const acc = byWallet.get(t.walletId);
    if (!acc) continue;

    acc.balance += t.txnType === "expense" ? -t.amount : t.amount;

    if (t.txnType === "expense" && t.date >= monthStart) {
      acc.spentThisMonth += t.amount;
      if (t.wantsVsNeeds === "want") acc.wantsThisMonth += t.amount;
      else acc.needsThisMonth += t.amount;
    }
  }

  const totalBalance = wallets.reduce(
    (sum, w) => sum + (byWallet.get(w.id)?.balance ?? 0),
    0,
  );

  const totalWantsThisMonth = wallets.reduce(
    (sum, w) => sum + (byWallet.get(w.id)?.wantsThisMonth ?? 0),
    0,
  );
  const totalNeedsThisMonth = wallets.reduce(
    (sum, w) => sum + (byWallet.get(w.id)?.needsThisMonth ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Total (aggregate):{" "}
            <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatINR(totalBalance)}
            </span>
          </p>
        </div>
        <SignOutButton />
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">Wants vs Needs (this month)</div>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Needs</div>
            <div className="mt-1 font-semibold tabular-nums">
              {formatINR(totalNeedsThisMonth)}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Wants</div>
            <div className="mt-1 font-semibold tabular-nums">
              {formatINR(totalWantsThisMonth)}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {wallets.map((w) => {
          const stats = byWallet.get(w.id) ?? {
            balance: 0,
            spentThisMonth: 0,
            wantsThisMonth: 0,
            needsThisMonth: 0,
          };
          return (
            <WalletCard
              key={w.id}
              id={w.id}
              name={w.name}
              balance={stats.balance}
              spentThisMonth={stats.spentThisMonth}
              monthlyBudget={w.monthlyBudget ?? null}
            />
          );
        })}
      </section>
    </div>
  );
}

