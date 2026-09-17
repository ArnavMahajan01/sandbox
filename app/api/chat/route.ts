import { auth } from "@clerk/nextjs/server"
import { openrouter } from "@openrouter/ai-sdk-provider"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"

export const maxDuration = 30

const model = process.env.OPENROUTER_MODEL ?? "openrouter/free"

export async function POST(req: Request) {
  const { isAuthenticated } = await auth()

  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: openrouter(model),
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
