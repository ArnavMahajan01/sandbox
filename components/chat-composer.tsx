"use client"

import {
  ArrowUpIcon,
  CarIcon,
  ChevronDownIcon,
  CrosshairIcon,
  Gamepad2Icon,
  GripIcon,
  PickaxeIcon,
  PlaneIcon,
  SwordsIcon,
  ZapIcon,
} from "lucide-react"

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

export function ChatComposer() {
  return (
    <div className="flex w-full flex-col gap-6">
      <InputGroup>
        <InputGroupTextarea placeholder="Describe the game you want to build…" />
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
          <Button size="icon-sm" className="ml-auto rounded-full">
            <ArrowUpIcon />
          </Button>
        </InputGroupAddon>
      </InputGroup>

      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="outline" size="sm" className="rounded-full">
          <PickaxeIcon />
          Voxel survival
        </Button>
        <Button variant="outline" size="sm" className="rounded-full">
          <SwordsIcon />
          Ink samurai duel
        </Button>
        <Button variant="outline" size="sm" className="rounded-full">
          <ZapIcon />
          Comic-book firefight
        </Button>
        <Button variant="outline" size="sm" className="rounded-full">
          <PlaneIcon />
          Realistic battlefield
        </Button>
        <Button variant="outline" size="sm" className="rounded-full">
          <CrosshairIcon />
          Fight-first shooter
        </Button>
        <Button variant="outline" size="sm" className="rounded-full">
          <CarIcon />
          Jungle expedition drive
        </Button>
        <Button variant="outline" size="sm" className="rounded-full">
          <Gamepad2Icon />
          Sunny kingdom platformer
        </Button>
      </div>
    </div>
  )
}
