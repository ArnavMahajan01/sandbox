import { tags } from "@trigger.dev/sdk"
import { chat, upsertIncomingMessage } from "@trigger.dev/sdk/ai"
import { stepCountIs, type UIMessage } from "ai"

import { formatDollars } from "@/lib/credits/format"
import { chargeStep } from "@/lib/credits/ledger"
import { priceUsage } from "@/lib/credits/pricing"
import { createGameSandbox } from "@/lib/daytona/util"
import { gameClientDataSchema, gameModelSettings } from "@/lib/games/agent"
import { loadGameChat, saveGameChat } from "@/lib/games/chat-store"
import { gameInstructions } from "@/lib/games/instructions"
import { DEFAULT_GAME_MODEL_ID, isGameModelId } from "@/lib/games/model-catalog"
import { createGameTools } from "@/lib/games/tools"

const gameOrg = chat.local<{ orgId: string }>({ id: "game-org" })

function withoutTrailingReply(messages: UIMessage[]) {
  return messages.at(-1)?.role === "assistant"
    ? messages.slice(0, -1)
    : messages
}

export const gameChat = chat.agent({
  id: "game-chat",
  system: gameInstructions,
  // The picker lives on the client, so the chosen model rides in per turn.
  clientDataSchema: gameClientDataSchema,
  // Resolved per turn so each tool is scoped to this chat's game sandbox.
  tools: ({ chatId }) => createGameTools(chatId),
  onBoot: async ({ chatId }) => {
    const game = await loadGameChat(chatId)

    if (!game) {
      throw new Error("Game not found")
    }

    gameOrg.init({ orgId: game.orgId })
    await tags.add(["credits", `org:${game.orgId}`])
  },
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
  run: async ({ messages, tools, signal, streamText, clientData }) =>
    streamText({
      ...gameModelSettings(clientData?.modelId),
      messages,
      tools,
      abortSignal: signal,
      stopWhen: stepCountIs(20),
      // Charge the org after every model step. The response id is the ledger
      // key, so regenerate (or a retried step) cannot bill the same call twice.
      onStepEnd: async ({ usage, response, model }) => {
        const chosen = clientData?.modelId
        const modelId = isGameModelId(model.modelId)
          ? model.modelId
          : isGameModelId(chosen)
            ? chosen
            : DEFAULT_GAME_MODEL_ID
        const balance = await chargeStep({
          orgId: gameOrg.orgId,
          responseId: response.id,
          amount: priceUsage(modelId, usage),
        })

        chat.response.write({
          type: "data-credits",
          id: "balance",
          data: { formatted: formatDollars(balance) },
          transient: true,
        })
      },
    }),
})
