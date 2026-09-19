import { engine } from "@/lib/games/instructions/engine"
import { generatingGames } from "@/lib/games/instructions/generating-games"
import { purpose } from "@/lib/games/instructions/purpose"
import { runtime } from "@/lib/games/instructions/runtime"
import { workflow } from "@/lib/games/instructions/workflow"

const snippets = [purpose, runtime, engine, generatingGames, workflow]

export const gameInstructions = snippets.join("\n\n")
