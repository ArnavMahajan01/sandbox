import { auth } from "@clerk/nextjs/server"

export default async function GamePage({ params }: PageProps<"/games/[id]">) {
  await auth.protect({ unauthenticatedUrl: "/sign-in" })

  const { id } = await params

  return (
    <main className="flex min-h-svh flex-col p-6">
      <p>{id}</p>
    </main>
  )
}
