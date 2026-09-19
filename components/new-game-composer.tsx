"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { ChatComposer } from "@/components/chat-composer"
import { Button } from "@/components/ui/button"
import { createGame } from "@/lib/games/actions"
import {
  DEFAULT_GAME_MODEL_ID,
  type GameModelId,
} from "@/lib/games/model-catalog"
import { queueGamePrompt } from "@/lib/games/pending-prompt"
import { suggestions } from "@/lib/games/suggestions"

export function NewGameComposer() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [modelId, setModelId] = useState<GameModelId>(DEFAULT_GAME_MODEL_ID)
  const [isPending, startTransition] = useTransition()

  function submitGame(nextValue: string, field: "prompt" | "suggestion") {
    const formData = new FormData()
    formData.set(field, nextValue)
    startTransition(async () => {
      const id = await createGame(formData)
      if (!id) return
      queueGamePrompt(id, nextValue, modelId)
      router.push(`/games/${id}`)
    })
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <ChatComposer
        formId="new-game"
        value={value}
        onValueChange={setValue}
        disabled={isPending}
        modelId={modelId}
        onModelChange={setModelId}
        onSubmit={(prompt) => {
          submitGame(prompt, "prompt")
        }}
      />
      <div className="flex flex-wrap justify-center gap-3">
        {suggestions.map(({ icon: Icon, label }) => (
          <Button
            key={label}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={isPending}
            onClick={() => {
              submitGame(label, "suggestion")
            }}
          >
            <Icon />
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
