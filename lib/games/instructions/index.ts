import { generatingGames } from "@/lib/games/instructions/generating-games"
import { purpose } from "@/lib/games/instructions/purpose"
import { runtime } from "@/lib/games/instructions/runtime"
import { workflow } from "@/lib/games/instructions/workflow"

const snippets = [purpose, runtime, generatingGames, workflow]

export const gameInstructions = snippets.join("\n\n")
