"use client"

import {
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

const CreditsContext = createContext<{
  credits: string
  setCredits: (credits: string) => void
} | null>(null)

export function CreditsProvider({
  initialCredits,
  children,
}: {
  initialCredits: string
  children: ReactNode
}) {
  const [credits, setCredits] = useState(initialCredits)

  useEffect(() => {
    setCredits(initialCredits)
  }, [initialCredits])

  const value = useMemo(() => ({ credits, setCredits }), [credits])

  return <CreditsContext value={value}>{children}</CreditsContext>
}

export function useCredits() {
  const credits = use(CreditsContext)

  if (!credits) {
    throw new Error("useCredits must be used within CreditsProvider")
  }

  return credits
}
