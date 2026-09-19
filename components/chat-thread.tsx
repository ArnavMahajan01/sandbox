"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { useChat } from "@ai-sdk/react"
import type { ChatSessionPersistedState } from "@trigger.dev/sdk/chat"
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"
import { APICallError, type UIMessage } from "ai"

import { ChatComposer } from "@/components/chat-composer"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Spinner } from "@/components/ui/spinner"
import { mintChatAccessToken, startChatSession } from "@/lib/games/chat-actions"
import { pendingGamePromptKey } from "@/lib/games/pending-prompt"
import type { gameChat } from "@/src/trigger/chat"

function AssistantAvatar() {
  return (
    <MessageAvatar className="size-8 self-start rounded-lg bg-transparent">
      <Image
        src="/logo.svg"
        alt=""
        width={32}
        height={32}
        className="size-full"
      />
    </MessageAvatar>
  )
}

function describeError(error: Error) {
  if (APICallError.isInstance(error) && error.statusCode === 401) {
    return "Your session expired. Sign in again to keep chatting."
  }

  return "The response could not be generated. Please try again."
}

export function ChatThread({
  gameId,
  initialMessages,
  initialSessions,
}: {
  gameId: string
  initialMessages: UIMessage[]
  initialSessions?: Record<string, ChatSessionPersistedState>
}) {
  const [value, setValue] = useState("")
  const transport = useTriggerChatTransport<typeof gameChat>({
    task: "game-chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
    sessions: initialSessions,
  })
  const {
    messages,
    sendMessage,
    setMessages,
    regenerate,
    stop: aiStop,
    status,
    error,
  } = useChat({
    id: gameId,
    messages: initialMessages,
    transport,
    resume: Boolean(initialSessions),
  })

  // stopGeneration aborts the running task's streamText (works even after a
  // page refresh reconnected the stream), while aiStop resets the UI status.
  const stop = useCallback(() => {
    void transport.stopGeneration(gameId)
    void aiStop()
  }, [transport, gameId, aiStop])

  useEffect(() => {
    // Opening prompts are queued by the homepage composer before it navigates.
    const key = pendingGamePromptKey(gameId)
    const pendingPrompt = sessionStorage.getItem(key)
    if (!pendingPrompt) return

    if (initialMessages.length > 0) {
      sessionStorage.removeItem(key)
      return
    }

    if (messages.length === 0 && status === "ready") {
      void sendMessage({ text: pendingPrompt })
      return
    }

    if (messages.length > 0) {
      sessionStorage.removeItem(key)
    }
  }, [gameId, initialMessages.length, messages.length, sendMessage, status])

  const isStreaming = status === "submitted" || status === "streaming"

  return (
    <MessageScrollerProvider>
      <div className="flex h-svh min-h-0 flex-col">
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-3xl px-6 py-8">
              {messages.map(({ id, role, parts }) => {
                const isAssistant = role === "assistant"
                const text = parts
                  .filter((part) => part.type === "text")
                  .map((part) => part.text)
                  .join("")

                if (!text) return null

                return (
                  <MessageScrollerItem
                    key={id}
                    messageId={id}
                    scrollAnchor={!isAssistant}
                  >
                    <Message align={isAssistant ? "start" : "end"}>
                      {isAssistant && <AssistantAvatar />}
                      <MessageContent>
                        <Bubble variant={isAssistant ? "ghost" : "secondary"}>
                          <BubbleContent className="whitespace-pre-wrap">
                            {text}
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                )
              })}

              {status === "submitted" && (
                <Message align="start">
                  <AssistantAvatar />
                  <MessageContent>
                    <Bubble variant="ghost">
                      <BubbleContent>
                        <Spinner className="text-muted-foreground" />
                      </BubbleContent>
                    </Bubble>
                  </MessageContent>
                </Message>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>

        <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-3 px-6 pb-6">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{describeError(error)}</AlertDescription>
              <AlertAction>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void regenerate()}
                >
                  Retry
                </Button>
              </AlertAction>
            </Alert>
          )}

          <ChatComposer
            value={value}
            onValueChange={setValue}
            isStreaming={isStreaming}
            onStop={stop}
            onSubmit={(nextValue) => {
              // A failed turn leaves its user message (and any partial reply)
              // behind; drop them so the retry doesn't send a dangling turn.
              if (error) {
                setMessages((current) =>
                  current.at(-1)?.role === "assistant"
                    ? current.slice(0, -2)
                    : current.slice(0, -1)
                )
              }

              void sendMessage({ text: nextValue })
              setValue("")
            }}
          />
        </div>
      </div>
    </MessageScrollerProvider>
  )
}
