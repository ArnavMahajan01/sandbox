import "server-only"

import { eq, sql } from "drizzle-orm"

import { creditLedger, db } from "@/lib/db"

export const NANOS_PER_DOLLAR = BigInt(1_000_000_000)
export const FREE_CREDIT_NANOS = NANOS_PER_DOLLAR

export async function applyCredits(
  entries: {
    orgId: string
    entryKey: string
    amount: bigint
  }[]
) {
  if (entries.length === 0) {
    return
  }

  await db.insert(creditLedger).values(entries).onConflictDoNothing()
}

export async function getBalance(orgId: string) {
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${creditLedger.amount}), 0)`,
    })
    .from(creditLedger)
    .where(eq(creditLedger.orgId, orgId))

  return BigInt(row?.total ?? 0) + FREE_CREDIT_NANOS
}
