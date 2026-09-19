"use client"

import { ArrowUpIcon, SquareIcon } from "lucide-react"

import { ModelPicker } from "@/components/model-picker"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import type { GameModelId } from "@/lib/games/model-catalog"

export function ChatComposer({
  value,
  onValueChange,
  onSubmit,
  onStop,
  isStreaming = false,
  formId,
  disabled = false,
  modelId,
  onModelChange,
}: {
  value: string
  onValueChange: (value: string) => void
  onSubmit: (value: string) => void
  onStop?: () => void
  isStreaming?: boolean
  formId?: string
  disabled?: boolean
  // Omitted where there is nowhere to send the choice yet, which hides the
  // picker rather than showing a control that does nothing.
  modelId?: GameModelId
  onModelChange?: (modelId: GameModelId) => void
}) {
  return (
    <form
      id={formId}
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault()
        // While a turn is streaming the button acts as Stop; Enter must not
        // send a new message.
        if (isStreaming || disabled) return
        const nextValue = value.trim()
        if (!nextValue) return
        onSubmit(nextValue)
      }}
    >
      <InputGroup>
        <InputGroupTextarea
          name="prompt"
          placeholder="Describe the game you want to build…"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
        <InputGroupAddon align="block-end">
          {modelId && onModelChange && (
            <ModelPicker
              modelId={modelId}
              onModelChange={onModelChange}
              disabled={disabled}
            />
          )}
          {isStreaming ? (
            <Button
              type="button"
              size="icon-sm"
              onClick={onStop}
              aria-label="Stop generating"
              className="ml-auto rounded-full"
            >
              <SquareIcon className="fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon-sm"
              disabled={disabled || !value.trim()}
              aria-label="Send message"
              className="ml-auto rounded-full"
            >
              <ArrowUpIcon />
            </Button>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
