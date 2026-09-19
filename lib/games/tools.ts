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
export function createGameTools(gameId: string) {
  return {
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
