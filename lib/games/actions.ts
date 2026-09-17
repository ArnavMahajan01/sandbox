"use server"

import { auth } from "@clerk/nextjs/server"
import { openrouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import { revalidatePath } from "next/cache"

import { db, games } from "@/lib/db"

const TITLE_MAX_LENGTH = 80

// Fastest free OpenRouter model that actually returns a short title on this
// key (no paid credits). Override with OPENROUTER_TITLE_MODEL if you want
// a different one.
const titleModel =
  process.env.OPENROUTER_TITLE_MODEL ?? "nex-agi/nex-n2.5-mini:free"

async function generateTitle(prompt: string) {
  const { text } = await generateText({
    model: openrouter(titleModel),
    instructions:
      "You name games. Reply with a title of at most six words for the game " +
      "described by the user. Reply with the title alone: no quotes, no " +
      "punctuation at the end, no explanation.",
    prompt,
    // The budget has to cover reasoning tokens, which this model spends
    // even on a request this short.
    maxOutputTokens: 256,
  })

  return text.trim().replace(/^["']|["']$/g, "")
}

export async function createGame(formData: FormData) {
  const { userId, orgId } = await auth()

  if (!userId) {
    throw new Error("Not signed in")
  }

  if (!orgId) {
    throw new Error("No active organization")
  }

  const prompt = String(formData.get("prompt") ?? "").trim()
  const suggestion = String(formData.get("suggestion") ?? "").trim()
  const description = prompt || suggestion

  if (!description) {
    return
  }

  // Naming the game is not worth failing creation over, so fall back to the
  // description the player typed.
  const title = await generateTitle(description).catch(() => description)

  const [game] = await db
    .insert(games)
    .values({
      orgId,
      title: (title || description).slice(0, TITLE_MAX_LENGTH),
    })
    .returning({ id: games.id })

  revalidatePath("/(app)", "layout")
  return game.id
}
