import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { OfflineSyncer } from "@/components/OfflineSyncer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <OfflineSyncer />
      <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto grid w-full max-w-md grid-cols-3 px-4 py-3 text-sm">
          <Link className="text-center" href="/">
            Dashboard
          </Link>
          <Link className="text-center" href="/import">
            Import
          </Link>
          <Link className="text-center" href="/settings">
            Settings
          </Link>
        </div>
      </nav>
    </div>
  );
}

