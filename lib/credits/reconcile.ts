import "server-only"

import type { BillingSubscriptionItem } from "@clerk/backend"
import { clerkClient } from "@clerk/nextjs/server"

import { formatDollars } from "@/lib/credits/format"
import {
  applyCredits,
  FREE_CREDIT_NANOS,
  getBalance,
  NANOS_PER_DOLLAR,
} from "@/lib/credits/ledger"

const MONTHLY_CREDIT_NANOS = BigInt(10) * NANOS_PER_DOLLAR
const SKIP_STATUSES = new Set(["abandoned", "incomplete", "upcoming"])
const UNPAID_CURRENT_STATUSES = new Set(["past_due"])
const MS_PER_DAY = 86_400_000

async function getOrganizationBillingSubscriptionAPI(organizationId: string) {
  const client = await clerkClient()
  return client.billing.getOrganizationBillingSubscription(organizationId)
}

export async function reconcileOrganizationCredits(orgId: string) {
  let subscription

  try {
    subscription = await getOrganizationBillingSubscriptionAPI(orgId)
  } catch {
    return
  }

  const months = new Set<string>()

  for (const item of subscription.subscriptionItems) {
    for (const month of paidMonths(item)) {
      months.add(month)
    }
  }

  await applyCredits(
    [...months].map((month) => ({
      orgId,
      entryKey: `billing:${month}`,
      amount: MONTHLY_CREDIT_NANOS,
    }))
  )
}

export async function getOrganizationCredits(orgId: string | null | undefined) {
  if (!orgId) {
    return FREE_CREDIT_NANOS
  }

  await reconcileOrganizationCredits(orgId)
  return getBalance(orgId)
}

export async function getFormattedOrganizationCredits(
  orgId: string | null | undefined
) {
  return formatDollars(await getOrganizationCredits(orgId))
}

function paidMonths(item: BillingSubscriptionItem) {
  if (item.isFreeTrial || item.plan?.isDefault) {
    return []
  }

  if (SKIP_STATUSES.has(item.status)) {
    return []
  }

  let latestStart = item.periodStart

  if (UNPAID_CURRENT_STATUSES.has(item.status)) {
    latestStart = shiftPeriod(latestStart, item.planPeriod, -1)
  }

  const paidFrom = item.createdAt + (item.plan?.freeTrialDays ?? 0) * MS_PER_DAY
  const months: string[] = []
  let cursor = latestStart

  for (let i = 0; i < 120; i++) {
    if (shiftPeriod(cursor, item.planPeriod, 1) <= paidFrom) {
      break
    }

    if (item.planPeriod === "annual") {
      for (let month = 0; month < 12; month++) {
        months.push(yearMonth(addUtcMonths(cursor, month)))
      }
    } else {
      months.push(yearMonth(cursor))
    }

    cursor = shiftPeriod(cursor, item.planPeriod, -1)
  }

  return months
}

function shiftPeriod(
  timestamp: number,
  planPeriod: "month" | "annual",
  delta: number
) {
  return addUtcMonths(timestamp, planPeriod === "annual" ? delta * 12 : delta)
}

function addUtcMonths(timestamp: number, months: number) {
  const date = new Date(timestamp)
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.getTime()
}

function yearMonth(timestamp: number) {
  const date = new Date(timestamp)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}
