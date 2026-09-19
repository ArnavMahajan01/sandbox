import { isGameModelId, type GameModelId } from "@/lib/games/model-catalog"

/**
 * The opening prompt and the model picked alongside it, handed from the
 * homepage composer to the game's chat across the navigation. Session storage
 * rather than the database: the game row is created before the first message
 * exists, and this is scratch state that dies with the tab.
 */
export type PendingGamePrompt = {
  prompt: string
  modelId?: GameModelId
}

export function pendingGamePromptKey(gameId: string) {
  return `pending-game-prompt:${gameId}`
}

export function queueGamePrompt(
  gameId: string,
  prompt: string,
  modelId: GameModelId
) {
  sessionStorage.setItem(
    pendingGamePromptKey(gameId),
    JSON.stringify({ prompt, modelId })
  )
}

export function readGamePrompt(gameId: string): PendingGamePrompt | null {
  const raw = sessionStorage.getItem(pendingGamePromptKey(gameId))

  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "prompt" in parsed &&
      typeof parsed.prompt === "string"
    ) {
      const modelId = "modelId" in parsed ? parsed.modelId : undefined
      return {
        prompt: parsed.prompt,
        modelId: isGameModelId(modelId) ? modelId : undefined,
      }
    }
  } catch {
    // Queued by an older build, which stored the bare prompt string.
  }

  return { prompt: raw }
}

export function clearGamePrompt(gameId: string) {
  sessionStorage.removeItem(pendingGamePromptKey(gameId))
}
