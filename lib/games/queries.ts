import "server-only"

import { auth } from "@clerk/nextjs/server"
import type { UIMessage } from "ai"
import { and, desc, eq } from "drizzle-orm"

import { db, games } from "@/lib/db"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function listGames() {
  const { orgId } = await auth()

  if (!orgId) {
    return []
  }

  return db
    .select()
    .from(games)
    .where(eq(games.orgId, orgId))
    .orderBy(desc(games.createdAt))
}

export async function getGame(id: string) {
  const { orgId } = await auth()

  // Postgres rejects a malformed uuid outright, so screen it out as a miss.
  if (!orgId || !UUID_PATTERN.test(id)) {
    return undefined
  }

  const [game] = await db
    .select()
    .from(games)
    .where(and(eq(games.id, id), eq(games.orgId, orgId)))
    .limit(1)

  return game
}

// Takes `orgId` explicitly because it runs after the response has started
// streaming, where the request-scoped Clerk context is no longer available.
export async function saveGameMessages({
  id,
  orgId,
  messages,
}: {
  id: string
  orgId: string
  messages: UIMessage[]
}) {
  await db
    .update(games)
    .set({ messages })
    .where(and(eq(games.id, id), eq(games.orgId, orgId)))
}
