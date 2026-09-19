"use client"

import { useEffect, useState } from "react"

export function ChatPreview({
  gameId,
  revision = 0,
}: {
  gameId: string
  revision?: number
}) {
  const [loaded, setLoaded] = useState(false)

  // Daytona keeps the same preview URL across updates, so bumping the revision
  // is what forces the iframe to remount and refetch the freshly written game.
  useEffect(() => {
    setLoaded(false)
  }, [revision])

  return (
    <div className="relative h-full w-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Loading preview…</p>
        </div>
      )}
      <iframe
        // Remount on every revision so a finished turn reloads the preview even
        // though the underlying Daytona URL never changes. The `v` param also
        // busts the browser cache for index.html.
        key={revision}
        // Same-origin proxy that injects X-Daytona-Skip-Preview-Warning so the
        // Daytona warning page never shows. Pointing at index.html keeps
        // relative asset paths resolving back through the proxy.
        src={`/api/games/${gameId}/preview/index.html?v=${revision}`}
        title="Game preview"
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin"
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}
