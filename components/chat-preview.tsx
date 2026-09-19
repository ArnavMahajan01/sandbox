"use client"

import { useState } from "react"

export function ChatPreview({ gameId }: { gameId: string }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative h-full w-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Loading preview…</p>
        </div>
      )}
      <iframe
        // Same-origin proxy that injects X-Daytona-Skip-Preview-Warning so the
        // Daytona warning page never shows. Pointing at index.html keeps
        // relative asset paths resolving back through the proxy.
        src={`/api/games/${gameId}/preview/index.html`}
        title="Game preview"
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin"
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}
