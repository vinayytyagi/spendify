import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ImportTransactionsWizard } from "@/components/ImportTransactionsWizard";

export default async function ImportPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Import</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Import Excel/CSV transactions into a wallet.
        </p>
      </header>

      <ImportTransactionsWizard />
    </div>
  );
}

