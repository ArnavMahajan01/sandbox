"use client"

import { useCallback, useState } from "react"
import type { ChatSessionPersistedState } from "@trigger.dev/sdk/chat"
import type { UIMessage } from "ai"

import { ChatPreview } from "@/components/chat-preview"
import { ChatThread } from "@/components/chat-thread"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

export function GameChat({
  gameId,
  initialMessages,
  initialSessions,
  hasSandbox,
}: {
  gameId: string
  initialMessages: UIMessage[]
  initialSessions?: Record<string, ChatSessionPersistedState>
  hasSandbox: boolean
}) {
  // Bumped each time a chat turn finishes so the preview reloads the latest
  // game files. Kept here since the thread produces it and the preview consumes
  // it; a stable callback keeps useChat's captured onFinish valid.
  const [previewRevision, setPreviewRevision] = useState(0)
  const reloadPreview = useCallback(() => {
    setPreviewRevision((revision) => revision + 1)
  }, [])

  const thread = (
    <ChatThread
      gameId={gameId}
      initialMessages={initialMessages}
      initialSessions={initialSessions}
      onTurnFinish={reloadPreview}
    />
  )

  if (!hasSandbox) {
    return <div className="h-svh">{thread}</div>
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-svh">
      <ResizablePanel defaultSize="50" minSize="30">
        {thread}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="50" minSize="20">
        <ChatPreview gameId={gameId} revision={previewRevision} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
