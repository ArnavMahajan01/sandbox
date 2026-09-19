/**
 * Client-safe model catalog: plain data only, so a picker can import it from a
 * component. The provider instance lives in `models.ts` and the per-model
 * `streamText` settings in `agent.ts`, both server-only.
 */

export type GameModel = {
  id: string
  name: string
  tagline: string
}

/**
 * Zero-cost `:free` OpenRouter models only — nothing here draws down credits.
 *
 * Picked from the free models that pass three filters: they support tool
 * calling (every game is written through the file tools), they actually reason,
 * and a live probe confirmed they return a tool call. That last check matters —
 * Thinking Machines' Inkling models look ideal on paper but answer 403,
 * "only available on agentic harnesses".
 */
export const GAME_MODELS = [
  {
    id: "deepseek/deepseek-v4-flash-0731:free",
    name: "DeepSeek V4 Flash",
    tagline:
      "The most-used free model on OpenRouter, and the strongest all-rounder here. 1M context.",
  },
  {
    id: "qwen/qwen3.8-27b:free",
    name: "Qwen3.8 27B",
    tagline:
      "Highest reasoning score of any free model, at the deepest effort. Its free pool is often full.",
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 26B",
    tagline: "Close second on reasoning quality, and quick to answer.",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra",
    tagline:
      "Biggest free model available, built for orchestration. Second most-used free model.",
  },
  {
    id: "inclusionai/ling-3.0-flash-vl:free",
    name: "Ling 3.0 Flash VL",
    tagline: "Mid-tier reasoning with fast replies. Good for quick edits.",
  },
  {
    id: "nex-agi/nex-n2.5-pro:free",
    name: "Nex-N2.5 Pro",
    tagline:
      "Agentic coding tuned for a visual feedback loop, which is exactly this job.",
  },
  {
    id: "poolside/laguna-s-2.1:free",
    name: "Laguna S 2.1",
    tagline:
      "A dedicated coding-agent model. Writes code well but does not expose reasoning.",
  },
] as const satisfies readonly GameModel[]

export type GameModelId = (typeof GAME_MODELS)[number]["id"]

export const DEFAULT_GAME_MODEL_ID =
  "deepseek/deepseek-v4-flash-0731:free" satisfies GameModelId

export const GAME_MODEL_IDS = GAME_MODELS.map((model) => model.id) as [
  GameModelId,
  ...GameModelId[],
]

export function isGameModelId(value: unknown): value is GameModelId {
  return GAME_MODEL_IDS.includes(value as GameModelId)
}

export function getGameModel(id: GameModelId): GameModel {
  return GAME_MODELS.find((model) => model.id === id) ?? GAME_MODELS[0]
}
