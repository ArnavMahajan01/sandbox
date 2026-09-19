"use client"

import { ChevronDownIcon, GripIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InputGroupButton } from "@/components/ui/input-group"
import {
  GAME_MODELS,
  getGameModel,
  isGameModelId,
  type GameModelId,
} from "@/lib/games/model-catalog"

export function ModelPicker({
  modelId,
  onModelChange,
  disabled = false,
}: {
  modelId: GameModelId
  onModelChange: (modelId: GameModelId) => void
  disabled?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <InputGroupButton disabled={disabled}>
            <GripIcon />
            {getGameModel(modelId).name}
            <ChevronDownIcon />
          </InputGroupButton>
        }
      />
      {/* Content defaults to the trigger's width, which leaves no room for a
          tagline, so it is widened here. */}
      <DropdownMenuContent className="w-80 max-w-[calc(100vw-3rem)]">
        <DropdownMenuRadioGroup
          value={modelId}
          onValueChange={(value) => {
            // Base UI types the radio value as `any`.
            if (isGameModelId(value)) onModelChange(value)
          }}
        >
          {GAME_MODELS.map((model) => (
            <DropdownMenuRadioItem
              key={model.id}
              value={model.id}
              // Keyboard type-ahead would otherwise match against the tagline.
              label={model.name}
              closeOnClick
              className="items-start py-1.5"
            >
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{model.name}</span>
                <span className="text-xs text-pretty text-muted-foreground">
                  {model.tagline}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
