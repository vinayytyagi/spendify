import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [wallets, txns] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, monthlyBudget: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      select: {
        walletId: true,
        amount: true,
        txnType: true,
        wantsVsNeeds: true,
        date: true,
      },
    }),
  ]);

  const monthStart = startOfMonth(new Date());
  const daysPassed = Math.max(1, new Date().getDate());

  const perWallet = new Map<
    string,
    {
      balance: number;
      spentThisMonth: number;
      wantsThisMonth: number;
      needsThisMonth: number;
    }
  >();

  for (const w of wallets) {
    perWallet.set(w.id, {
      balance: 0,
      spentThisMonth: 0,
      wantsThisMonth: 0,
      needsThisMonth: 0,
    });
  }

  for (const t of txns) {
    const acc = perWallet.get(t.walletId);
    if (!acc) continue;

    acc.balance += t.txnType === "expense" ? -t.amount : t.amount;

    if (t.txnType === "expense" && t.date >= monthStart) {
      acc.spentThisMonth += t.amount;
      if (t.wantsVsNeeds === "want") acc.wantsThisMonth += t.amount;
      else acc.needsThisMonth += t.amount;
    }
  }

  const walletSummaries = wallets.map((w) => {
    const s = perWallet.get(w.id)!;
    const budget = w.monthlyBudget ?? null;
    const burnRatePct = budget ? Math.min(100, (s.spentThisMonth / budget) * 100) : null;
    const burnPerDay = budget ? s.spentThisMonth / daysPassed : null;
    const daysLeft =
      budget && burnPerDay && burnPerDay > 0
        ? Math.floor((budget - s.spentThisMonth) / burnPerDay)
        : null;

    return {
      walletId: w.id,
      name: w.name,
      monthlyBudget: budget,
      balance: s.balance,
      spentThisMonth: s.spentThisMonth,
      wantsThisMonth: s.wantsThisMonth,
      needsThisMonth: s.needsThisMonth,
      burnRatePct,
      projectedDaysLeft: daysLeft,
    };
  });

  const total = walletSummaries.reduce(
    (acc, w) => {
      acc.balance += w.balance;
      acc.spentThisMonth += w.spentThisMonth;
      acc.wantsThisMonth += w.wantsThisMonth;
      acc.needsThisMonth += w.needsThisMonth;
      return acc;
    },
    { balance: 0, spentThisMonth: 0, wantsThisMonth: 0, needsThisMonth: 0 },
  );

  return NextResponse.json({ total, wallets: walletSummaries });
}

