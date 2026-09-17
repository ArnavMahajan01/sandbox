export function pendingGamePromptKey(gameId: string) {
  return `pending-game-prompt:${gameId}`
}

export function queueGamePrompt(gameId: string, prompt: string) {
  sessionStorage.setItem(pendingGamePromptKey(gameId), prompt)
}
