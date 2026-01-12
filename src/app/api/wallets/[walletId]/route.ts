import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z
  .object({
    name: z.string().min(1).max(40).optional(),
    monthlyBudget: z.number().int().positive().nullable().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Empty patch" });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { walletId } = await params;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const wallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId },
    select: { id: true },
  });
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

  const name = parsed.data.name?.trim();

  const updated = await prisma.wallet.update({
    where: { id: wallet.id },
    data: {
      ...(name ? { name } : {}),
      ...(parsed.data.monthlyBudget !== undefined
        ? { monthlyBudget: parsed.data.monthlyBudget }
        : {}),
      ...(parsed.data.isArchived !== undefined ? { isArchived: parsed.data.isArchived } : {}),
    },
  });

  return NextResponse.json({ wallet: updated });
}

