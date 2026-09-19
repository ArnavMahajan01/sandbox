import { z } from "zod"

import {
  DEFAULT_GAME_MODEL_ID,
  GAME_MODEL_IDS,
  isGameModelId,
  type GameModelId,
} from "./model-catalog"
import { gameLanguageModel } from "./models"

/**
 * The deepest effort each model actually publishes — OpenRouter rejects a level
 * a model does not list, and none of these expose `max` through the provider's
 * effort union. `null` means the model publishes no levels at all: send no
 * reasoning options and take its default, which is already on.
 */
const REASONING_EFFORT: Record<GameModelId, "xhigh" | "high" | null> = {
  "deepseek/deepseek-v4-flash-0731:free": "high",
  "qwen/qwen3.8-27b:free": "xhigh",
  "google/gemma-4-26b-a4b-it:free": null,
  "nvidia/nemotron-3-ultra-550b-a55b:free": "high",
  "inclusionai/ling-3.0-flash-vl:free": null,
  "nex-agi/nex-n2.5-pro:free": "high",
  "poolside/laguna-s-2.1:free": null,
}

/**
 * Both levels are optional so chats started before model selection existed keep
 * working — they send no client data and fall through to the default. The enum
 * (rather than a bare string) is what types the transport's `clientData`.
 */
export const gameClientDataSchema = z
  .object({ modelId: z.enum(GAME_MODEL_IDS).optional() })
  .optional()

/**
 * Where OpenRouter goes when the chosen model will not answer. Sent as the
 * `models` array, which fails over server-side on rate limits, downtime and
 * moderation refusals, so a stalled step recovers inside the same request
 * instead of surfacing as a failed turn. Only the model that actually runs is
 * billed, and all of these are free anyway.
 *
 * Limited to models a live probe found consistently available. Note this
 * rescues a single model's pool being full; it cannot rescue the account-wide
 * `free-models-per-day` cap, where every free model returns 429 at once.
 */
const FALLBACK_CHAIN = [
  "deepseek/deepseek-v4-flash-0731:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
] satisfies GameModelId[]

/** Turns a catalog id into the model half of the `streamText` call. */
export function gameModelSettings(modelId: GameModelId | undefined) {
  const id = isGameModelId(modelId) ? modelId : DEFAULT_GAME_MODEL_ID
  const effort = REASONING_EFFORT[id]

  return {
    model: gameLanguageModel(id),
    providerOptions: {
      openrouter: {
        // Chosen model first, so the order holds whether OpenRouter takes the
        // primary from `model` or from `models[0]`.
        models: [id, ...FALLBACK_CHAIN.filter((entry) => entry !== id)],
        // Applies to whichever model answers; OpenRouter maps the level into
        // each one's own vocabulary.
        ...(effort ? { reasoning: { effort } } : {}),
      },
    },
  }
}
