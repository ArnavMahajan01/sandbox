import { auth } from "@clerk/nextjs/server"
import { openrouter } from "@openrouter/ai-sdk-provider"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
} from "ai"

import { getGame, saveGameMessages } from "@/lib/games/queries"

export const maxDuration = 30

const model = process.env.OPENROUTER_MODEL ?? "openrouter/free"

function withoutTrailingReply(messages: UIMessage[]) {
  return messages.at(-1)?.role === "assistant"
    ? messages.slice(0, -1)
    : messages
}

export async function POST(req: Request) {
  const { isAuthenticated } = await auth()

  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const {
    id,
    message,
    trigger,
  }: {
    id: string
    message?: UIMessage
    trigger: "submit-message" | "regenerate-message"
  } = await req.json()

  const isRegenerate = trigger === "regenerate-message"

  if (!isRegenerate && !message) {
    return Response.json({ error: "Missing message" }, { status: 400 })
  }

  const game = await getGame(id)

  if (!game) {
    return Response.json({ error: "Game not found" }, { status: 404 })
  }

  // The stored thread is the source of truth; the client only sends the turn
  // it is adding.
  const messages = await validateUIMessages({
    messages: isRegenerate
      ? withoutTrailingReply(game.messages)
      : [...game.messages, message],
  })

  const result = streamText({
    model: openrouter(model),
    messages: await convertToModelMessages(messages),
  })

  // Drain the stream server-side so the turn is still saved when the client
  // disconnects mid-response.
  result.consumeStream()

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      // Without this the reply is stored with an empty id, because the id is
      // otherwise generated on the client after the stream arrives.
      generateMessageId: generateId,
      onEnd: async ({ messages, outcome }) => {
        // A failed turn would persist a dangling user message, so leave the
        // stored thread alone and let the next attempt start from it.
        if (outcome.status === "failed") return

        await saveGameMessages({
          id: game.id,
          orgId: game.orgId,
          messages,
        })
      },
    }),
  })
}
