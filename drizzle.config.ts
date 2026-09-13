import { loadEnvConfig } from "@next/env"
import { parseEnv } from "@neon/env"
import { defineConfig } from "drizzle-kit"

import neonConfig from "./neon"

loadEnvConfig(process.cwd())

const { postgres } = parseEnv(neonConfig, ["DATABASE_URL_UNPOOLED"])

export default defineConfig({
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: postgres.databaseUrlUnpooled,
  },
})
