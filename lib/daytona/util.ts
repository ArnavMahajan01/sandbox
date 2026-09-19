import { Daytona, type Sandbox } from "@daytona/sdk"

import { loadGameSandboxId, saveGameSandboxId } from "@/lib/games/chat-store"

export const GAME_DIR = "/home/daytona/game"
export const GAME_PORT = 3000
const GAME_SERVER_SESSION = "game-server"

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Game</title>
  </head>
  <body>
    <h1>New game</h1>
  </body>
</html>
`

/**
 * Creates a Daytona sandbox for a game, writes /home/daytona/game/index.html,
 * and saves the sandbox id on the game.
 */
export async function createGameSandbox(gameId: string) {
  const daytona = new Daytona()

  const sandbox = await daytona.create({ language: "typescript" })

  await sandbox.fs.createFolder("/home/daytona/game", "755")
  await sandbox.fs.uploadFile(
    Buffer.from(INDEX_HTML),
    "/home/daytona/game/index.html"
  )

  await saveGameSandboxId(gameId, sandbox.id)

  return { sandbox }
}

/**
 * Returns a started sandbox for a game, guaranteed. Reuses the sandbox recorded
 * on the game (starting it if it's stopped/archived) and falls back to creating
 * a fresh one when the game has no sandbox or the recorded one is gone. Chat
 * agent tools can call this to always get a live sandbox to work against.
 */
export async function getGameSandbox(
  gameId: string
): Promise<{ sandbox: Sandbox }> {
  const sandboxId = await loadGameSandboxId(gameId)

  if (sandboxId) {
    try {
      const daytona = new Daytona()
      const sandbox = await daytona.get(sandboxId)

      if (sandbox.state !== "started") {
        await sandbox.start()
      }

      return { sandbox }
    } catch {
      // Recorded sandbox no longer exists; fall through to recreate it.
    }
  }

  return createGameSandbox(gameId)
}

/**
 * Ensures a static server serving /home/daytona/game/index.html is running in
 * the sandbox and returns the sandbox. Health-checks the port first so we reuse
 * an existing server instead of starting a new one each call. Callers mint their
 * own preview URL from the returned sandbox.
 */
export async function startGameServer(sandboxId: string) {
  const daytona = new Daytona()

  const sandbox = await daytona.get(sandboxId)

  if (sandbox.state !== "started") {
    await sandbox.start()
  }

  const health = await sandbox.process.executeCommand(
    `python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:${GAME_PORT}', timeout=2)"`
  )

  if (health.exitCode !== 0) {
    // A session keeps the process alive after executeSessionCommand returns.
    await sandbox.process
      .createSession(GAME_SERVER_SESSION)
      .catch(() => undefined)

    await sandbox.process.executeSessionCommand(GAME_SERVER_SESSION, {
      command: `python3 -m http.server ${GAME_PORT} --directory ${GAME_DIR}`,
      runAsync: true,
    })
  }

  return { sandbox }
}
