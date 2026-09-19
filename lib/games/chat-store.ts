import type { UIMessage } from "ai"
import { and, eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { games } from "@/lib/db/schema"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL is not set")
}

const pool = new Pool({
  connectionString,
  max: 5,
})

const db = drizzle({ client: pool })

export async function loadGameChat(chatId: string) {
  if (!UUID_PATTERN.test(chatId)) {
    return undefined
  }

  const [game] = await db
    .select({
      id: games.id,
      orgId: games.orgId,
      messages: games.messages,
    })
    .from(games)
    .where(eq(games.id, chatId))
    .limit(1)

  return game
}

export async function saveGameSandboxId(id: string, sandboxId: string) {
  await db.update(games).set({ sandboxId }).where(eq(games.id, id))
}

export async function saveGameChat({
  id,
  orgId,
  messages,
  lastEventId,
}: {
  id: string
  orgId: string
  messages: UIMessage[]
  lastEventId?: string
}) {
  await db
    .update(games)
    .set({
      messages,
      ...(lastEventId !== undefined ? { lastEventId } : {}),
    })
    .where(and(eq(games.id, id), eq(games.orgId, orgId)))
}
