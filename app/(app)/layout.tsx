import { auth } from "@clerk/nextjs/server"

import { AppSidebar } from "@/components/app-sidebar"
import { CreditsProvider } from "@/components/credits-provider"
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
    <CreditsProvider initialCredits={credits}>
      <SidebarProvider>
        <AppSidebar games={games} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </CreditsProvider>
  )
}
