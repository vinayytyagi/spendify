import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createWalletSchema = z.object({
  name: z.string().min(1).max(40),
  monthlyBudget: z.number().int().positive().nullable().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wallets = await prisma.wallet.findMany({
    where: { userId: session.user.id, isArchived: false },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ wallets });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = createWalletSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const name = parsed.data.name.trim();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const wallet = await prisma.wallet.create({
    data: {
      userId: session.user.id,
      name,
      monthlyBudget: parsed.data.monthlyBudget ?? null,
    },
  });

  return NextResponse.json({ wallet }, { status: 201 });
}

