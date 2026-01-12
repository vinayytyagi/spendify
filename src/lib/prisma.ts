import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function assertValidMongoDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error(
      "Missing DATABASE_URL. Set it in .env (see env.example).",
    );
  }

  // Prisma MongoDB requires a database name in the connection string:
  // mongodb+srv://USER:PASSWORD@HOST/<DB_NAME>?...
  let dbName = "";
  try {
    const u = new URL(raw);
    dbName = (u.pathname || "").replace(/^\//, "");
  } catch {
    // If URL parsing fails, Prisma will provide a clearer error later.
    return;
  }

  if (!dbName) {
    throw new Error(
      'Invalid DATABASE_URL: missing database name (e.g. "...mongodb.net/spendify?retryWrites=true&w=majority").',
    );
  }
}

assertValidMongoDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

