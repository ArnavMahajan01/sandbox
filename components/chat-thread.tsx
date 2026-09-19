"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { useChat } from "@ai-sdk/react"
import type { ChatSessionPersistedState } from "@trigger.dev/sdk/chat"
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"
import {
  APICallError,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
  type DynamicToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from "ai"
import { CircleCheck, CircleX } from "lucide-react"

import { ChatComposer } from "@/components/chat-composer"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireItem,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"
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

// Friendly verbs for the game file tools; unknown tools fall back to their id.
const TOOL_LABELS: Record<string, string> = {
  writeFile: "Write file",
  readFile: "Read file",
  replaceText: "Edit file",
  listFiles: "List files",
  deleteFile: "Delete file",
}

function toolPathDetail(input: unknown): string | null {
  if (input && typeof input === "object" && "path" in input) {
    const value = (input as { path?: unknown }).path
    if (typeof value === "string" && value) return value
  }
  return null
}

// Renders a single tool call as a status marker: active (running), done, or
// failed. State names come from the AI SDK's ToolUIPart discriminator.
function ToolMarker({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  const label = TOOL_LABELS[getToolName(part)] ?? getToolName(part)
  const detail = toolPathDetail(part.input)

  const status =
    part.state === "output-available"
      ? "done"
      : part.state === "output-error" || part.state === "output-denied"
        ? "failed"
        : "active"

  return (
    <Marker
      data-status={status}
      className="data-[status=failed]:text-destructive data-[status=done]:text-foreground"
    >
      <MarkerIcon>
        {status === "active" ? (
          <Spinner />
        ) : status === "done" ? (
          <CircleCheck className="text-emerald-600 dark:text-emerald-500" />
        ) : (
          <CircleX />
        )}
      </MarkerIcon>
      <MarkerContent>
        {status === "active"
          ? `${label}\u2026`
          : status === "failed"
            ? `${label} failed`
            : label}
        {detail && (
          <span className="ml-1.5 font-mono text-xs opacity-70">{detail}</span>
        )}
      </MarkerContent>
    </Marker>
  )
}

// Input/output shapes of the `askPlayer` human-in-the-loop tool (see
// lib/games/tools.ts). Kept local so the questionnaire can read a pending tool
// call's input without threading the tool's inferred types through the UI.
type AskPlayerOption = { id: string; label: string; description: string }
type AskPlayerInput = {
  dimension: string
  question: string
  options: AskPlayerOption[]
}
type AskPlayerOutput = { id: string; label: string }

// Human-friendly names for the game dimensions the agent can ask about.
const DIMENSION_LABELS: Record<string, string> = {
  loop: "Gameplay loop",
  goal: "Goal",
  world: "World",
  look: "Look",
  feel: "Feel",
  audio: "Audio",
  scope: "Scope",
}

function isAskPlayerPart(part: ToolUIPart | DynamicToolUIPart) {
  return getToolName(part) === "askPlayer"
}

// Renders a pending `askPlayer` tool call as a chatCN questionnaire. The tool
// has no server-side execute, so it stays in "input-available" until the player
// picks an option here; answering calls onAnswer, which feeds the result back
// to the agent to resume the paused turn.
function AskPlayerQuestionnaire({
  toolCallId,
  input,
  onAnswer,
}: {
  toolCallId: string
  input: AskPlayerInput
  onAnswer: (output: AskPlayerOutput) => void
}) {
  const dimensionLabel =
    DIMENSION_LABELS[input.dimension] ?? input.dimension

  return (
    <Bubble variant="ghost" className="w-full">
      <BubbleContent className="w-full">
        <Questionnaire
          onSubmit={(event) => {
            event.preventDefault()
            const chosenId = new FormData(event.currentTarget).get(
              toolCallId
            )
            if (typeof chosenId !== "string") return
            const chosen = input.options.find(
              (option) => option.id === chosenId
            )
            if (!chosen) return
            onAnswer({ id: chosen.id, label: chosen.label })
          }}
        >
          <QuestionnaireItem name={toolCallId} required>
            <Badge variant="secondary" className="w-fit">
              {dimensionLabel}
            </Badge>
            <QuestionnaireTitle>{input.question}</QuestionnaireTitle>
            <QuestionnaireChoices>
              {input.options.map((option) => (
                <QuestionnaireChoice key={option.id} value={option.id}>
                  {option.label}
                  {option.description && (
                    <QuestionnaireChoiceDescription>
                      {option.description}
                    </QuestionnaireChoiceDescription>
                  )}
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>
            <QuestionnaireActions>
              <QuestionnaireSubmit size="sm">Answer</QuestionnaireSubmit>
            </QuestionnaireActions>
          </QuestionnaireItem>
        </Questionnaire>
      </BubbleContent>
    </Bubble>
  )
}

// Once answered, the tool part carries the chosen option; show it as a
// completed marker so the conversation records what the player picked.
function AskPlayerAnswer({ output }: { output: AskPlayerOutput }) {
  return (
    <Marker data-status="done" className="text-foreground">
      <MarkerIcon>
        <CircleCheck className="text-emerald-600 dark:text-emerald-500" />
      </MarkerIcon>
      <MarkerContent>
        You chose
        <span className="ml-1.5 font-medium">{output.label}</span>
      </MarkerContent>
    </Marker>
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
  onTurnFinish,
}: {
  gameId: string
  initialMessages: UIMessage[]
  initialSessions?: Record<string, ChatSessionPersistedState>
  onTurnFinish?: () => void
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
    addToolOutput,
    regenerate,
    stop: aiStop,
    status,
    error,
  } = useChat({
    id: gameId,
    messages: initialMessages,
    transport,
    resume: Boolean(initialSessions),
    // When the player answers an askPlayer question, its tool call gains an
    // output; this fires the next turn automatically so the paused agent
    // resumes without the player also hitting send.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    // Fires when the assistant response finishes streaming, i.e. the turn is
    // done and the sandbox files reflect the latest changes.
    onFinish: () => onTurnFinish?.(),
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
                const toolParts = isAssistant ? parts.filter(isToolUIPart) : []

                if (!text && toolParts.length === 0) return null

                return (
                  <MessageScrollerItem
                    key={id}
                    messageId={id}
                    scrollAnchor={!isAssistant}
                  >
                    <Message align={isAssistant ? "start" : "end"}>
                      {isAssistant && <AssistantAvatar />}
                      <MessageContent>
                        {toolParts.length > 0 && (
                          <div className="flex flex-col gap-1.5">
                            {toolParts.map((part) => {
                              if (isAskPlayerPart(part)) {
                                if (part.state === "output-available") {
                                  return (
                                    <AskPlayerAnswer
                                      key={part.toolCallId}
                                      output={part.output as AskPlayerOutput}
                                    />
                                  )
                                }

                                if (part.state === "input-available") {
                                  return (
                                    <AskPlayerQuestionnaire
                                      key={part.toolCallId}
                                      toolCallId={part.toolCallId}
                                      input={part.input as AskPlayerInput}
                                      onAnswer={(output) =>
                                        addToolOutput({
                                          tool: "askPlayer",
                                          toolCallId: part.toolCallId,
                                          output,
                                        })
                                      }
                                    />
                                  )
                                }
                              }

                              return (
                                <ToolMarker key={part.toolCallId} part={part} />
                              )
                            })}
                          </div>
                        )}
                        {text && (
                          <Bubble variant={isAssistant ? "ghost" : "secondary"}>
                            <BubbleContent className="whitespace-pre-wrap">
                              {text}
                            </BubbleContent>
                          </Bubble>
                        )}
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
