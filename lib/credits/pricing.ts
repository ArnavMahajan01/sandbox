import type { LanguageModelUsage } from "ai"

import {
  DEFAULT_GAME_MODEL_ID,
  isGameModelId,
  type GameModelId,
} from "@/lib/games/model-catalog"

/**
 * Dollars per million tokens. Catalog ids are the `:free` OpenRouter slugs;
 * rates are the paid counterparts so building a game still draws credits.
 * Cache writes are 1.25× fresh input when OpenRouter does not list them.
 */
type TokenRates = {
  input: number
  cacheRead: number
  cacheWrite: number
  output: number
}

const MODEL_RATES = {
  "deepseek/deepseek-v4-flash-0731:free": {
    input: 0.04,
    cacheRead: 0.016,
    cacheWrite: 0.05,
    output: 0.08,
  },
  "qwen/qwen3.8-27b:free": {
    input: 0.214,
    cacheRead: 0.15,
    cacheWrite: 0.2675,
    output: 2.55,
  },
  "google/gemma-4-26b-a4b-it:free": {
    input: 0.09,
    cacheRead: 0.05,
    cacheWrite: 0.1125,
    output: 0.3,
  },
  "nvidia/nemotron-3-ultra-550b-a55b:free": {
    input: 0.6,
    cacheRead: 0.12,
    cacheWrite: 0.75,
    output: 2.4,
  },
  "inclusionai/ling-3.0-flash-vl:free": {
    input: 0.06,
    cacheRead: 0.012,
    cacheWrite: 0.075,
    output: 0.18,
  },
  "nex-agi/nex-n2.5-pro:free": {
    input: 0.12,
    cacheRead: 0.024,
    cacheWrite: 0.15,
    output: 0.36,
  },
  "poolside/laguna-s-2.1:free": {
    input: 0.09,
    cacheRead: 0.009,
    cacheWrite: 0.1125,
    output: 0.18,
  },
} as const satisfies Record<GameModelId, TokenRates>

const MILLION = BigInt(1_000_000)
const NANOS_PER_DOLLAR_AS_NUMBER = 1_000_000_000

export function priceUsage(modelId: string, usage: LanguageModelUsage) {
  const rates = ratesFor(modelId)
  const cacheRead = usage.inputTokenDetails?.cacheReadTokens ?? 0
  const cacheWrite = usage.inputTokenDetails?.cacheWriteTokens ?? 0
  const inputTotal = usage.inputTokens ?? 0
  const fresh =
    usage.inputTokenDetails?.noCacheTokens ??
    Math.max(0, inputTotal - cacheRead - cacheWrite)
  const output = usage.outputTokens ?? 0

  return (
    nanosFor(fresh, rates.input) +
    nanosFor(cacheRead, rates.cacheRead) +
    nanosFor(cacheWrite, rates.cacheWrite) +
    nanosFor(output, rates.output)
  )
}

function ratesFor(modelId: string): TokenRates {
  if (isGameModelId(modelId)) {
    return MODEL_RATES[modelId]
  }

  const withFree = `${modelId}:free`
  if (isGameModelId(withFree)) {
    return MODEL_RATES[withFree]
  }

  return MODEL_RATES[DEFAULT_GAME_MODEL_ID]
}

function nanosFor(tokens: number, dollarsPerMillion: number) {
  if (tokens <= 0) {
    return BigInt(0)
  }

  const nanosPerMillion = BigInt(
    Math.round(dollarsPerMillion * NANOS_PER_DOLLAR_AS_NUMBER)
  )

  return (BigInt(tokens) * nanosPerMillion) / MILLION
}
