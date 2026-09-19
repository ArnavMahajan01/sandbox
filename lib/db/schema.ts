// Add tables here, then run `npm run db:push`.

import type { UIMessage } from "ai"
import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    title: text("title").notNull(),
    sandboxId: text("sandbox_id"),
    messages: jsonb("messages").$type<UIMessage[]>().notNull().default([]),
    lastEventId: text("last_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("games_org_id_idx").on(table.orgId)]
)

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    entryKey: text("entry_key").notNull(),
    // Signed nano-dollars. 1_000_000_000 = $1; negative is a debit.
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("credit_ledger_org_id_entry_key_idx").on(
      table.orgId,
      table.entryKey
    ),
  ]
)

export type Game = typeof games.$inferSelect
export type NewGame = typeof games.$inferInsert
export type CreditLedger = typeof creditLedger.$inferSelect
export type NewCreditLedger = typeof creditLedger.$inferInsert
