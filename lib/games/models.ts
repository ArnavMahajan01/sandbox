import { createOpenRouter } from "@openrouter/ai-sdk-provider"

import { type GameModelId } from "./model-catalog"

/**
 * Server-only: reads the API key, so never import this from a client
 * component. Import `model-catalog.ts` there instead.
 *
 * `strict` matches the package's own default instance; the unset default is
 * `compatible`, which drops newer request fields like stream options.
 */
const provider = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  compatibility: "strict",
})

export function gameLanguageModel(id: GameModelId) {
  return provider(id)
}
