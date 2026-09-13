// Add tables here, then run `npm run db:push`.

import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("games_org_id_idx").on(table.orgId)],
)

export type Game = typeof games.$inferSelect
export type NewGame = typeof games.$inferInsert
