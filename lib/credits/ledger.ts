import { eq, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { FREE_CREDIT_NANOS } from "@/lib/credits/format"
import { creditLedger } from "@/lib/db/schema"

export { FREE_CREDIT_NANOS, NANOS_PER_DOLLAR } from "@/lib/credits/format"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL is not set")
}

const pool = new Pool({
  connectionString,
  max: 5,
})

const db = drizzle({ client: pool })

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

export async function chargeStep({
  orgId,
  responseId,
  amount,
}: {
  orgId: string
  responseId: string
  amount: bigint
}) {
  if (responseId && amount > BigInt(0)) {
    await applyCredits([
      {
        orgId,
        entryKey: responseId,
        amount: -amount,
      },
    ])
  }

  return getBalance(orgId)
}
