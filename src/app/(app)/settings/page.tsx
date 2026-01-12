import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateWalletForm } from "@/components/CreateWalletForm";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const userId = session.user.id;

  const [wallets, quickAdds] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, monthlyBudget: true },
    }),
    prisma.quickAdd.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, label: true, amount: true, walletId: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Manage wallets and quick adds.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold">Wallets</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {wallets.length === 0 ? (
            <li className="text-zinc-600 dark:text-zinc-400">
              No wallets yet.
            </li>
          ) : (
            wallets.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3">
                <span className="font-medium">{w.name}</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  Budget: {w.monthlyBudget ?? "—"}
                </span>
              </li>
            ))
          )}
        </ul>

        <CreateWalletForm />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold">Quick adds</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {quickAdds.length === 0 ? (
            <li className="text-zinc-600 dark:text-zinc-400">
              No quick adds yet.
            </li>
          ) : (
            quickAdds.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-3">
                <span className="font-medium">{q.label}</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  ₹{q.amount}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

