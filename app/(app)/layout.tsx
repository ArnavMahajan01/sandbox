import { auth } from "@clerk/nextjs/server"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getFormattedOrganizationCredits } from "@/lib/credits/reconcile"
import { listGames } from "@/lib/games/queries"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { orgId } = await auth()
  const [games, credits] = await Promise.all([
    listGames(),
    getFormattedOrganizationCredits(orgId),
  ])

  return (
    <SidebarProvider>
      <AppSidebar games={games} credits={credits} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
