import { Daytona } from "@daytona/sdk"

import { saveGameSandboxId } from "@/lib/games/chat-store"

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

  return sandbox
}
