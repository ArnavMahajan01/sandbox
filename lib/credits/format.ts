export const NANOS_PER_DOLLAR = BigInt(1_000_000_000)
export const FREE_CREDIT_NANOS = NANOS_PER_DOLLAR

export function formatDollars(amount: bigint) {
  const negative = amount < BigInt(0)
  const abs = negative ? -amount : amount
  const cents =
    (abs * BigInt(100) + NANOS_PER_DOLLAR / BigInt(2)) / NANOS_PER_DOLLAR
  const dollars = cents / BigInt(100)
  const remainder = cents % BigInt(100)

  return `${negative ? "-" : ""}$${dollars.toString()}.${remainder
    .toString()
    .padStart(2, "0")}`
}
