import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  walletId: z.string().min(8).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    walletId: searchParams.get("walletId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const walletId = parsed.data.walletId;
  if (walletId) {
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId, isArchived: false },
      select: { id: true },
    });
    if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  const from = parsed.data.from ? new Date(parsed.data.from) : undefined;
  const to = parsed.data.to ? new Date(parsed.data.to) : undefined;

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      ...(walletId ? { walletId } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "desc" },
    take: 200,
  });

  return NextResponse.json({ transactions });
}

