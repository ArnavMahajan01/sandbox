import { openrouter } from "@openrouter/ai-sdk-provider"
import { chat, upsertIncomingMessage } from "@trigger.dev/sdk/ai"
import type { UIMessage } from "ai"

import { createGameSandbox } from "@/lib/daytona/util"
import { loadGameChat, saveGameChat } from "@/lib/games/chat-store"

const model = process.env.OPENROUTER_MODEL ?? "openrouter/free"

function withoutTrailingReply(messages: UIMessage[]) {
  return messages.at(-1)?.role === "assistant"
    ? messages.slice(0, -1)
    : messages
}

export const gameChat = chat.agent({
  id: "game-chat",
  // Fires once per chat, on the first user message — provision the game's sandbox.
  onChatStart: async ({ chatId }) => {
    await createGameSandbox(chatId)
  },
  hydrateMessages: async ({ chatId, trigger, incomingMessages }) => {
    const game = await loadGameChat(chatId)

    if (!game) {
      throw new Error("Game not found")
    }

    const stored = [...game.messages]

    // hydrateMessages replaces the runtime accumulator, including regenerate.
    if (trigger === "regenerate-message") {
      return withoutTrailingReply(stored)
    }

    if (upsertIncomingMessage(stored, { trigger, incomingMessages })) {
      await saveGameChat({
        id: game.id,
        orgId: game.orgId,
        messages: stored,
      })
    }

    return stored
  },
  onTurnComplete: async ({ chatId, uiMessages, lastEventId, error }) => {
    // A failed turn would persist a dangling assistant reply; the user
    // message is already stored from hydrateMessages.
    if (error) return

    const game = await loadGameChat(chatId)

    if (!game) return

    await saveGameChat({
      id: game.id,
      orgId: game.orgId,
      messages: uiMessages,
      lastEventId,
    })
  },
  run: async ({ messages, signal, streamText }) =>
    streamText({
      model: openrouter(model),
      messages,
      abortSignal: signal,
    }),
})
