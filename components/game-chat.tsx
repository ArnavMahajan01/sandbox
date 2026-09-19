"use client"

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
  const thread = (
    <ChatThread
      gameId={gameId}
      initialMessages={initialMessages}
      initialSessions={initialSessions}
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
        <ChatPreview gameId={gameId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
