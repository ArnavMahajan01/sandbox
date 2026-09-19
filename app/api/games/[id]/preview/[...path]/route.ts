import { auth } from "@clerk/nextjs/server"

import { GAME_PORT, startGameServer } from "@/lib/daytona/util"
import { getGame } from "@/lib/games/queries"

// Hop-by-hop / encoding headers we must not forward: fetch already decoded the
// body, so passing these back would make the browser mis-decode it.
const STRIP_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
])

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { isAuthenticated } = await auth()

  if (!isAuthenticated) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { id, path } = await params
  const game = await getGame(id)

  if (!game) {
    return new Response("Not found", { status: 404 })
  }

  if (!game.sandboxId) {
    return new Response("Sandbox not ready", { status: 409 })
  }

  const { sandbox } = await startGameServer(game.sandboxId)
  const preview = await sandbox.getSignedPreviewUrl(GAME_PORT, 3600)
  const { search } = new URL(request.url)

  // Injecting this header skips Daytona's interstitial preview warning page.
  const upstream = await fetch(`${preview.url}/${path.join("/")}${search}`, {
    headers: { "X-Daytona-Skip-Preview-Warning": "true" },
    cache: "no-store",
  })

  const headers = new Headers()
  upstream.headers.forEach((value, key) => {
    if (!STRIP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })

  // The preview reloads in place after every turn; never let the browser serve
  // a stale index.html or asset from a previous revision of the game.
  headers.set("cache-control", "no-store")

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  })
}
