import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const upsertSchema = z.object({
  clientId: z.string().min(8),
  walletId: z.string().min(8),
  date: z.string().datetime(),
  description: z.string().min(1).max(200),
  amount: z.number().int().positive(),
  txnType: z.enum(["expense", "income"]),
  wantsVsNeeds: z.enum(["want", "need"]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const json = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { clientId, walletId, date, description, amount, txnType, wantsVsNeeds } =
    parsed.data;

  const wallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId, isArchived: false },
    select: { id: true },
  });
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

  const txn = await prisma.transaction.upsert({
    where: {
      userId_clientId: { userId, clientId },
    },
    create: {
      userId,
      walletId,
      clientId,
      date: new Date(date),
      description: description.trim(),
      amount,
      txnType,
      wantsVsNeeds,
    },
    update: {
      walletId,
      date: new Date(date),
      description: description.trim(),
      amount,
      txnType,
      wantsVsNeeds,
    },
  });

  return NextResponse.json({ transaction: txn }, { status: 200 });
}

