import bcrypt from "bcryptjs";
import { PrismaClient, TransactionType, WantsVsNeeds } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;

  if (!email || !password) {
    console.log("Seed skipped: set SEED_EMAIL and SEED_PASSWORD to seed data.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user =
    (await prisma.user.findUnique({ where: { email } })) ??
    (await prisma.user.create({
      data: { email, passwordHash },
    }));

  const foodWallet =
    (await prisma.wallet.findFirst({
      where: { userId: user.id, name: "Food", isArchived: false },
    })) ??
    (await prisma.wallet.create({
      data: { userId: user.id, name: "Food", monthlyBudget: 8000 },
    }));

  const travelWallet =
    (await prisma.wallet.findFirst({
      where: { userId: user.id, name: "Travel", isArchived: false },
    })) ??
    (await prisma.wallet.create({
      data: { userId: user.id, name: "Travel", monthlyBudget: 3000 },
    }));

  await prisma.quickAdd.createMany({
    data: [
      {
        userId: user.id,
        walletId: foodWallet.id,
        label: "Tea",
        amount: 50,
        txnType: TransactionType.expense,
        wantsVsNeeds: WantsVsNeeds.need,
      },
      {
        userId: user.id,
        walletId: travelWallet.id,
        label: "Metro",
        amount: 100,
        txnType: TransactionType.expense,
        wantsVsNeeds: WantsVsNeeds.need,
      },
    ],
    skipDuplicates: true,
  });

  // A couple sample transactions (idempotency is handled later via clientId upsert API)
  const now = new Date();
  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        walletId: foodWallet.id,
        clientId: `seed-food-${now.getTime()}`,
        date: now,
        description: "Tea",
        amount: 50,
        txnType: TransactionType.expense,
        wantsVsNeeds: WantsVsNeeds.need,
      },
      {
        userId: user.id,
        walletId: travelWallet.id,
        clientId: `seed-travel-${now.getTime()}`,
        date: now,
        description: "Metro",
        amount: 100,
        txnType: TransactionType.expense,
        wantsVsNeeds: WantsVsNeeds.need,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed completed for:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

