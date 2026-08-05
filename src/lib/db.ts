import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Netlify injects NETLIFY_DB_URL in builds and functions; DATABASE_URL covers
// local tooling. The fallback keeps module evaluation safe at build time —
// queries against it simply fail with a connection error.
const connectionString =
  process.env.NETLIFY_DB_URL ??
  process.env.DATABASE_URL ??
  "postgresql://localhost:5432/workout_deck";

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
