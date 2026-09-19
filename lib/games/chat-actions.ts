"use server"

import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { chat, type ChatStartSessionParams } from "@trigger.dev/sdk/ai"

import { getGame } from "@/lib/games/queries"
import type { gameChat } from "@/src/trigger/chat"

const start = chat.createStartSessionAction<typeof gameChat>("game-chat")

async function requireGame(chatId: string) {
  const { isAuthenticated } = await auth()

  if (!isAuthenticated) {
    throw new Error("Unauthorized")
  }

  const game = await getGame(chatId)

  if (!game) {
    throw new Error("Game not found")
  }

  return game
}

export async function startChatSession(
  params: ChatStartSessionParams<typeof gameChat>
) {
  await requireGame(params.chatId)
  return start(params)
}

export async function mintChatAccessToken(chatId: string) {
  await requireGame(chatId)

  return triggerAuth.createPublicToken({
    scopes: {
      read: { sessions: chatId },
      write: { sessions: chatId },
    },
    expirationTime: "1h",
  })
}
