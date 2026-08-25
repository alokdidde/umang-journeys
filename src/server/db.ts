import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { umangPrisma?: PrismaClient };

export function getPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when PERSISTENCE_MODE=postgres");
  }

  if (!globalForPrisma.umangPrisma) {
    globalForPrisma.umangPrisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }

  return globalForPrisma.umangPrisma;
}
