import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const rowSchema = z.object({
  clientId: z.string().min(8),
  date: z.string().datetime(),
  description: z.string().min(1).max(200),
  amount: z.number().int().positive(),
  txnType: z.enum(["expense", "income"]),
  wantsVsNeeds: z.enum(["want", "need"]),
});

const payloadSchema = z.object({
  walletId: z.string().min(8),
  rows: z.array(rowSchema).min(1).max(5000),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const json = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const wallet = await prisma.wallet.findFirst({
    where: { id: parsed.data.walletId, userId, isArchived: false },
    select: { id: true },
  });
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

  const data = parsed.data.rows.map((r) => ({
    userId,
    walletId: wallet.id,
    clientId: r.clientId,
    date: new Date(r.date),
    description: r.description.trim(),
    amount: r.amount,
    txnType: r.txnType,
    wantsVsNeeds: r.wantsVsNeeds,
  }));

  const result = await prisma.transaction.createMany({
    data,
    skipDuplicates: true,
  });

  return NextResponse.json({ inserted: result.count }, { status: 201 });
}

