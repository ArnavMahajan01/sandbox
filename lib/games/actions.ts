"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

import { db, games } from "@/lib/db"

const TITLE_MAX_LENGTH = 80

export async function createGame(formData: FormData) {
  const { userId, orgId } = await auth()

  if (!userId) {
    throw new Error("Not signed in")
  }

  if (!orgId) {
    throw new Error("No active organization")
  }

  const prompt = String(formData.get("prompt") ?? "").trim()
  const suggestion = String(formData.get("suggestion") ?? "").trim()
  const title = prompt || suggestion

  if (!title) {
    return
  }

  await db.insert(games).values({
    orgId,
    title: title.slice(0, TITLE_MAX_LENGTH),
  })

  revalidatePath("/(app)", "layout")
}
