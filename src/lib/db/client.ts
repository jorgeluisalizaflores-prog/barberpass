// Cliente Prisma "crudo". ⚠️ NO importar fuera de src/lib/db (ESLint lo impide):
// el resto del código debe usar conBarberia() o conPlataforma().
import { PrismaClient } from "@prisma/client";

const global = globalThis as unknown as { __prisma?: PrismaClient };

export const prismaCrudo: PrismaClient =
  global.__prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") global.__prisma = prismaCrudo;
