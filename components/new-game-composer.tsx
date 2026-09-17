"use client"

import { useState } from "react"

import { ChatComposer } from "@/components/chat-composer"
import { Button } from "@/components/ui/button"
import { createGame } from "@/lib/games/actions"
import { suggestions } from "@/lib/games/suggestions"

export function NewGameComposer() {
  const [value, setValue] = useState("")

  async function submitGame(nextValue: string, field: "prompt" | "suggestion") {
    const formData = new FormData()
    formData.set(field, nextValue)
    await createGame(formData)
    setValue("")
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <ChatComposer
        formId="new-game"
        value={value}
        onValueChange={setValue}
        onSubmit={(prompt) => {
          void submitGame(prompt, "prompt")
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
            onClick={() => {
              void submitGame(label, "suggestion")
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
