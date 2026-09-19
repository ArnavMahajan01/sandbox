import path from "node:path"

import { tool } from "ai"
import { z } from "zod"

import { GAME_DIR, getGameSandbox } from "@/lib/daytona/util"

/**
 * Resolves a caller-supplied path against the game directory and guarantees it
 * cannot escape it. The path is always treated as relative to GAME_DIR, so a
 * leading "/" is harmless, and any ".." that would climb above GAME_DIR throws.
 */
function resolveGamePath(relativePath: string): string {
  const resolved = path.posix.normalize(path.posix.join(GAME_DIR, relativePath))

  if (resolved !== GAME_DIR && !resolved.startsWith(`${GAME_DIR}/`)) {
    throw new Error(
      `Path "${relativePath}" is outside the game directory and is not allowed.`
    )
  }

  return resolved
}

/**
 * File tools scoped to a single game's Daytona sandbox. Every tool resolves the
 * game's live sandbox and confines its target path to GAME_DIR, so the model can
 * only read and write within the game's own directory.
 */
/**
 * Parts of the game the agent can ask the player about. The agent picks one of
 * these before writing a question, so it commits to a single area of the design
 * rather than asking something vague.
 */
const ASK_PLAYER_DIMENSIONS = [
  "loop", // the core moment-to-moment gameplay loop
  "goal", // the objective, win/lose conditions, and progression
  "world", // the setting, theme, and environment
  "look", // the visual style, palette, and art direction
  "feel", // controls, game feel, pacing, and difficulty
  "audio", // music and sound design
  "scope", // how big or ambitious the game should be
] as const

export function createGameTools(gameId: string) {
  return {
    // Human-in-the-loop: this tool has no `execute`, so the AI SDK does not run
    // it. The tool call is surfaced to the UI, the player picks an option, and
    // the client sends back a result matching `outputSchema`. That result is fed
    // to the model as the tool output on the next turn.
    askPlayer: tool({
      description:
        "Ask the player a single multiple-choice question to settle a design decision before building. Use it when a choice would meaningfully change the game and you can't make a sensible default. First pick the dimension of the game you're asking about, then write one focused question with 2-4 distinct options. Do not use it for trivial choices you can decide yourself.",
      inputSchema: z.object({
        dimension: z
          .enum(ASK_PLAYER_DIMENSIONS)
          .describe(
            "The part of the game this question is about: \"loop\" (core gameplay loop), \"goal\" (objective and win/lose), \"world\" (setting and theme), \"look\" (visual style), \"feel\" (controls, pacing, difficulty), \"audio\" (music and sound), or \"scope\" (how ambitious the game is). Pick the single best-fitting area before writing the question."
          ),
        question: z
          .string()
          .describe(
            "The question to ask the player, phrased as one clear, self-contained sentence."
          ),
        options: z
          .array(
            z.object({
              id: z
                .string()
                .describe(
                  "A short, stable, machine-friendly identifier for this option, e.g. \"top_down\"."
                ),
              label: z
                .string()
                .describe("A short human-readable label shown to the player."),
              description: z
                .string()
                .describe(
                  "One sentence explaining what choosing this option means for the game."
                ),
            })
          )
          .min(2)
          .max(4)
          .describe("Between two and four distinct options for the player to choose from."),
      }),
      outputSchema: z.object({
        id: z.string().describe("The id of the option the player chose."),
        label: z.string().describe("The label of the option the player chose."),
      }),
    }),

    writeFile: tool({
      description:
        "Create or overwrite a file in the game directory with the given contents.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("Path relative to the game directory, e.g. \"index.html\"."),
        content: z.string().describe("Full contents to write to the file."),
      }),
      execute: async ({ path: filePath, content }) => {
        const target = resolveGamePath(filePath)
        const { sandbox } = await getGameSandbox(gameId)

        await sandbox.fs.uploadFile(Buffer.from(content), target)

        return `Wrote ${content.length} characters to ${filePath}.`
      },
    }),

    readFile: tool({
      description: "Read the full contents of a file in the game directory.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("Path relative to the game directory, e.g. \"index.html\"."),
      }),
      execute: async ({ path: filePath }) => {
        const target = resolveGamePath(filePath)
        const { sandbox } = await getGameSandbox(gameId)

        const buffer = await sandbox.fs.downloadFile(target)

        return buffer.toString("utf8")
      },
    }),

    replaceText: tool({
      description:
        "Replace every occurrence of a text snippet in a file in the game directory. Use for small, targeted edits instead of rewriting the whole file.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("Path relative to the game directory, e.g. \"index.html\"."),
        oldText: z
          .string()
          .describe("Exact text to find. Must match the file contents."),
        newText: z.string().describe("Replacement text."),
      }),
      execute: async ({ path: filePath, oldText, newText }) => {
        const target = resolveGamePath(filePath)
        const { sandbox } = await getGameSandbox(gameId)

        await sandbox.fs.replaceInFiles([target], oldText, newText)

        return `Replaced text in ${filePath}.`
      },
    }),

    listFiles: tool({
      description:
        "List the files and directories inside a path in the game directory.",
      inputSchema: z.object({
        path: z
          .string()
          .default(".")
          .describe(
            "Directory relative to the game directory. Defaults to the game directory root."
          ),
      }),
      execute: async ({ path: dirPath }) => {
        const target = resolveGamePath(dirPath)
        const { sandbox } = await getGameSandbox(gameId)

        const entries = await sandbox.fs.listFiles(target)

        return entries.map((entry) => ({
          name: entry.name,
          isDir: entry.isDir,
          size: entry.size,
        }))
      },
    }),

    deleteFile: tool({
      description: "Delete a file or directory in the game directory.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("Path relative to the game directory to delete."),
        recursive: z
          .boolean()
          .default(false)
          .describe("Set true to delete a non-empty directory."),
      }),
      execute: async ({ path: filePath, recursive }) => {
        const target = resolveGamePath(filePath)

        if (target === GAME_DIR) {
          throw new Error("Refusing to delete the game directory itself.")
        }

        const { sandbox } = await getGameSandbox(gameId)

        await sandbox.fs.deleteFile(target, recursive)

        return `Deleted ${filePath}.`
      },
    }),
  }
}
