import { readdir } from "node:fs/promises"
import path from "node:path"

import { Daytona, type Sandbox } from "@daytona/sdk"

import { loadGameSandboxId, saveGameSandboxId } from "@/lib/games/chat-store"

export const GAME_DIR = "/home/daytona/game"
export const GAME_PORT = 3000
const GAME_SERVER_SESSION = "game-server"

/**
 * Local directory whose contents are seeded into every new game sandbox. It is
 * never imported — files are copied onto the sandbox via the filesystem — so it
 * is bundled into the deployed task via the additionalFiles build extension in
 * trigger.config.ts and resolved relative to the project root at runtime.
 */
const RUNTIME_DIR = path.join(process.cwd(), "lib", "games", "runtime")

/**
 * Converts a host filesystem path (relative to RUNTIME_DIR) into its POSIX
 * destination inside the sandbox game directory.
 */
function toSandboxPath(relativePath: string): string {
  return path.posix.join(GAME_DIR, relativePath.split(path.sep).join("/"))
}

/**
 * Copies every file, folder, and subfolder from the local runtime directory
 * into the sandbox's game directory, preserving the directory structure.
 */
async function seedRuntimeFiles(sandbox: Sandbox) {
  const entries = await readdir(RUNTIME_DIR, {
    withFileTypes: true,
    recursive: true,
  })

  await sandbox.fs.createFolder(GAME_DIR, "755")

  const directories = entries.filter((entry) => entry.isDirectory())

  for (const dir of directories) {
    const localPath = path.join(dir.parentPath, dir.name)
    const relativePath = path.relative(RUNTIME_DIR, localPath)
    await sandbox.fs.createFolder(toSandboxPath(relativePath), "755")
  }

  const uploads = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const localPath = path.join(entry.parentPath, entry.name)
      const relativePath = path.relative(RUNTIME_DIR, localPath)
      return { source: localPath, destination: toSandboxPath(relativePath) }
    })

  if (uploads.length > 0) {
    await sandbox.fs.uploadFiles(uploads)
  }
}

/**
 * Creates a Daytona sandbox for a game, seeds it with the runtime template
 * files, and saves the sandbox id on the game.
 */
export async function createGameSandbox(gameId: string) {
  const daytona = new Daytona()

  const sandbox = await daytona.create({ language: "typescript" })

  await seedRuntimeFiles(sandbox)

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
