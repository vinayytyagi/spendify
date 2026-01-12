import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { TransactionList } from "@/components/TransactionList";
import { QuickAddBar } from "@/components/QuickAddBar";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";

export default async function WalletPage({
  params,
}: {
  params: Promise<{ walletId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return notFound();

  const { walletId } = await params;
  const userId = session.user.id;

  const wallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId, isArchived: false },
    select: { id: true, name: true, monthlyBudget: true },
  });
  if (!wallet) return notFound();

  const txns = await prisma.transaction.findMany({
    where: { userId, walletId: wallet.id },
    orderBy: { date: "desc" },
    take: 50,
    select: {
      id: true,
      date: true,
      description: true,
      amount: true,
      txnType: true,
      wantsVsNeeds: true,
    },
  });

  const balance = txns.reduce(
    (sum, t) => sum + (t.txnType === "expense" ? -t.amount : t.amount),
    0,
  );

  const wants = txns
    .filter((t) => t.txnType === "expense" && t.wantsVsNeeds === "want")
    .reduce((sum, t) => sum + t.amount, 0);
  const needs = txns
    .filter((t) => t.txnType === "expense" && t.wantsVsNeeds === "need")
    .reduce((sum, t) => sum + t.amount, 0);

  const quickAdds = await prisma.quickAdd.findMany({
    where: { userId, walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      label: true,
      amount: true,
      walletId: true,
      txnType: true,
      wantsVsNeeds: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link className="text-sm text-zinc-600 dark:text-zinc-400" href="/">
          ← Back
        </Link>
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold tracking-tight">{wallet.name}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Balance:{" "}
              <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {formatINR(balance)}
              </span>
            </p>
          </div>
          <AddTransactionSheet walletId={wallet.id} />
        </div>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">Wants vs Needs (latest)</div>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Needs</div>
            <div className="mt-1 font-semibold tabular-nums">{formatINR(needs)}</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Wants</div>
            <div className="mt-1 font-semibold tabular-nums">{formatINR(wants)}</div>
          </div>
        </div>
      </section>

      <QuickAddBar
        items={quickAdds.map((q) => ({
          id: q.id,
          label: q.label,
          amount: q.amount,
          walletId: q.walletId,
          txnType: q.txnType,
          wantsVsNeeds: q.wantsVsNeeds,
        }))}
      />

      <TransactionList
        items={txns.map((t) => ({
          id: t.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          txnType: t.txnType,
          wantsVsNeeds: t.wantsVsNeeds,
        }))}
      />
    </div>
  );
}

