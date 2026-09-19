import { PricingTable } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import type { Metadata } from "next"

import { getFormattedOrganizationCredits } from "@/lib/credits/reconcile"

export const metadata: Metadata = {
  title: "Billing",
}

export default async function BillingPage() {
  const { orgId } = await auth.protect({ unauthenticatedUrl: "/sign-in" })
  const credits = await getFormattedOrganizationCredits(orgId)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-12 shrink-0 items-center border-b px-4">
        <h1 className="text-sm">Billing</h1>
      </header>

      <div className="flex-1 px-6 py-10 md:px-10">
        <div className="max-w-3xl space-y-10">
          <section>
            <p className="text-sm text-muted-foreground">Available credits</p>
            <p className="mt-1 text-4xl font-medium tracking-tight">
              {credits}
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Credits cover the models that build and revise your games. A scene
              already in progress can finish below zero; the next build waits
              for more credits.
            </p>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-medium">Keep the studio running</h2>
              <p className="text-sm text-muted-foreground">
                Builder adds $10.00 every month, and unused credits roll over.
              </p>
            </div>

            <PricingTable
              for="organization"
              newSubscriptionRedirectUrl="/billing"
            />
          </section>
        </div>
      </div>
    </div>
  )
}
