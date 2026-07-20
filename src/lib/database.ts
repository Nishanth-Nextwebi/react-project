import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Single point of access to the underlying database client. Repositories
 * (src/repositories/*) and any future data-layer code should obtain the
 * client through this file rather than importing "@/lib/prisma" (or any
 * other driver) directly, so that swapping the underlying database/client
 * implementation only ever requires changing this file.
 */
export type Database = PrismaClient;

export function getDatabase(): Database {
  return prisma;
}

export const db: Database = getDatabase();

/**
 * Runs `fn` inside a single Prisma transaction. Repositories constructed
 * with the client passed into `fn` have all their queries participate in
 * the same atomic unit - callers never need to import Prisma's own
 * transaction-client type, since the cast is contained here.
 */
export function transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
  // Prisma's default interactive-transaction timeout is 5000ms, which several
  // sequential round trips (e.g. SmartSaveService's customer/vehicle/policy
  // lookups + writes) can exceed over a remote Aiven connection, aborting the
  // transaction mid-flight with "expired transaction" even though nothing was
  // actually wrong with the data.
  return db.$transaction((tx) => fn(tx as Database), { maxWait: 10000, timeout: 20000 });
}
