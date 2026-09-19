"use client"

import { useState } from "react"
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { cn } from "cn"
import { CoinsIcon, MessageSquareIcon, SquarePenIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import { Empty, EmptyDescription } from "@/components/ui/empty"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { Game } from "@/lib/db/schema"

export function AppSidebar({ games }: { games: Game[] }) {
  const pathname = usePathname()
  const [recentsOpen, setRecentsOpen] = useState(false)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
          <Image
            src="/logo.svg"
            alt=""
            width={20}
            height={20}
            className="size-5"
          />
          <span className="font-logo text-base">Sandbox</span>
        </div>
        <SidebarTrigger />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/"}
                  render={<Link href="/" />}
                >
                  <SquarePenIcon />
                  <span>New game</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recents</SidebarGroupLabel>
          <SidebarGroupContent>
            {games.length === 0 ? (
              <Empty className="border p-2 group-data-[collapsible=icon]:hidden">
                <EmptyDescription className="text-xs">
                  Your games will live here.
                </EmptyDescription>
              </Empty>
            ) : (
              <>
                <SidebarMenu className="group-data-[collapsible=icon]:hidden">
                  {games.map((game) => (
                    <SidebarMenuItem key={game.id}>
                      <SidebarMenuButton
                        isActive={pathname === `/games/${game.id}`}
                        render={<Link href={`/games/${game.id}`} />}
                      >
                        <MessageSquareIcon />
                        <span>{game.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>

                <SidebarMenu className="hidden group-data-[collapsible=icon]:block">
                  <SidebarMenuItem>
                    <Popover open={recentsOpen} onOpenChange={setRecentsOpen}>
                      <PopoverTrigger
                        render={
                          <SidebarMenuButton>
                            <MessageSquareIcon />
                            <span>Recents</span>
                          </SidebarMenuButton>
                        }
                      />
                      <PopoverContent
                        side="right"
                        align="start"
                        className="w-56 gap-0.5 p-1"
                      >
                        {games.map((game) => (
                          <Link
                            key={game.id}
                            href={`/games/${game.id}`}
                            onClick={() => setRecentsOpen(false)}
                            className={cn(
                              buttonVariants({ variant: "ghost" }),
                              "w-full justify-start"
                            )}
                          >
                            <MessageSquareIcon />
                            <span className="truncate">{game.title}</span>
                          </Link>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </SidebarMenuItem>
                </SidebarMenu>
              </>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/billing"}
              render={<Link href="/billing" />}
            >
              <CoinsIcon />
              <span>Credits</span>
            </SidebarMenuButton>
            <SidebarMenuBadge>$1.00</SidebarMenuBadge>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:px-0">
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootBox: "w-full! max-w-full",
                  organizationSwitcherTrigger:
                    "w-full! max-w-full justify-between!",
                  organizationPreview: "min-w-0",
                  organizationPreviewTextContainer: "min-w-0",
                  organizationPreviewMainIdentifier: "truncate",
                },
              }}
            />
          </div>
          <UserButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
