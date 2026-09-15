"use client"

import Image from "next/image"

import { ChatComposer } from "@/components/chat-composer"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

type MockMessage = {
  id: string
  role: "assistant" | "user"
  content: string
}

const conversation: MockMessage[] = [
  {
    id: "1",
    role: "user",
    content:
      "I want a top-down space shooter. One ship, endless waves of asteroids, and a score that ticks up the longer I survive.",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Good starting point. I'll set up a canvas with a ship that follows your pointer, asteroids drifting in from the edges, and a score counter in the corner. Arrow keys will work too, in case you'd rather play with the keyboard.",
  },
  {
    id: "3",
    role: "user",
    content: "Can the asteroids break into smaller pieces when I shoot them?",
  },
  {
    id: "4",
    role: "assistant",
    content:
      "Each large asteroid now splits into two medium ones, and those split again into three small fragments before disappearing. The smaller pieces move faster and are worth more points, so clearing a big rock is a real decision rather than a free hit.",
  },
  {
    id: "5",
    role: "user",
    content:
      "Nice. Make it get harder over time, and give me three lives instead of one.",
  },
  {
    id: "6",
    role: "assistant",
    content:
      "Every thirty seconds the spawn rate climbs and the asteroids pick up a little speed, so runs stay tense without turning unfair. You start with three lives, and losing one gives you a brief window of invulnerability to get clear of the debris.",
  },
]

export function ChatThread() {
  return (
    <MessageScrollerProvider>
      <div className="flex h-svh min-h-0 flex-col">
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-3xl px-6 py-8">
              {conversation.map(({ id, role, content }) => {
                const isAssistant = role === "assistant"

                return (
                  <MessageScrollerItem
                    key={id}
                    messageId={id}
                    scrollAnchor={!isAssistant}
                  >
                    <Message align={isAssistant ? "start" : "end"}>
                      {isAssistant && (
                        <MessageAvatar className="size-8 self-start rounded-lg bg-transparent">
                          <Image
                            src="/logo.svg"
                            alt=""
                            width={32}
                            height={32}
                            className="size-full"
                          />
                        </MessageAvatar>
                      )}
                      <MessageContent>
                        <Bubble variant={isAssistant ? "muted" : "default"}>
                          <BubbleContent>{content}</BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                )
              })}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>

        <div className="mx-auto w-full max-w-3xl shrink-0 px-6 pb-6">
          <ChatComposer />
        </div>
      </div>
    </MessageScrollerProvider>
  )
}
