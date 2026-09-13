import "server-only"

import { parseEnv } from "@neon/env"
import { attachDatabasePool } from "@vercel/functions"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import neonConfig from "@/neon"

import * as schema from "./schema"

const { postgres } = parseEnv(neonConfig, ["DATABASE_URL"])

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
}

function createPool() {
  const pool = new Pool({
    connectionString: postgres.databaseUrl,
    max: 5,
  })
  attachDatabasePool(pool)
  return pool
}

export const pool = globalForDb.pool ?? createPool()

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool
}

export const db = drizzle({ client: pool, schema })

export * from "./schema"
