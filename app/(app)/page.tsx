import { auth } from "@clerk/nextjs/server"
import Image from "next/image"

import { ChatComposer } from "@/components/chat-composer"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { suggestions } from "@/lib/games/suggestions"

export default async function Page() {
  await auth.protect({ unauthenticatedUrl: "/sign-in" })

  return (
    <main className="flex min-h-svh flex-col">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <Image src="/logo.svg" alt="" width={48} height={48} />
          </EmptyMedia>
          <EmptyTitle className="text-2xl font-bold">
            What should we build today?
          </EmptyTitle>
          <EmptyDescription>
            Build your own racers, shooters, puzzles and whole worlds using your
            own words. If you can describe it, you can play it.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="max-w-3xl gap-6">
          <ChatComposer />
          <div className="flex flex-wrap justify-center gap-3">
            {suggestions.map(({ icon: Icon, label }) => (
              <Button
                key={label}
                form="new-game"
                type="submit"
                name="suggestion"
                value={label}
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                <Icon />
                {label}
              </Button>
            ))}
          </div>
        </EmptyContent>
      </Empty>
    </main>
  )
}
