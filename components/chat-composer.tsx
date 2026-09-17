"use client"

import { ArrowUpIcon, ChevronDownIcon, GripIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"

export function ChatComposer({
  value,
  onValueChange,
  onSubmit,
  formId,
  disabled = false,
}: {
  value: string
  onValueChange: (value: string) => void
  onSubmit: (value: string) => void
  formId?: string
  disabled?: boolean
}) {
  return (
    <form
      id={formId}
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault()
        if (disabled) return
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
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <InputGroupButton>
                  <GripIcon />
                  Kimi K3
                  <ChevronDownIcon />
                </InputGroupButton>
              }
            />
            <DropdownMenuContent>
              <DropdownMenuItem>Kimi K3</DropdownMenuItem>
              <DropdownMenuItem>Kimi K2</DropdownMenuItem>
              <DropdownMenuItem>Kimi Flash</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="submit"
            size="icon-sm"
            disabled={disabled}
            className="ml-auto rounded-full"
          >
            <ArrowUpIcon />
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
