import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { GameChat } from "@/components/game-chat"
import { mintChatAccessToken } from "@/lib/games/chat-actions"
import { getGame } from "@/lib/games/queries"

export default async function GamePage({ params }: PageProps<"/games/[id]">) {
  await auth.protect({ unauthenticatedUrl: "/sign-in" })

  const { id } = await params
  const game = await getGame(id)

  if (!game) {
    notFound()
  }

  const initialSessions = game.lastEventId
    ? {
        [game.id]: {
          publicAccessToken: await mintChatAccessToken(game.id),
          lastEventId: game.lastEventId,
        },
      }
    : undefined

  return (
    <GameChat
      gameId={game.id}
      initialMessages={game.messages}
      initialSessions={initialSessions}
      hasSandbox={Boolean(game.sandboxId)}
    />
  )
}
