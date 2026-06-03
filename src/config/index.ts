import os from "node:os"

const readEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback

  if (!value) throw new Error(`Missing required environment variable: ${key}`)

  return value
}

export const config = {
  // Environment / secrets
  databaseUrl: readEnv("DATABASE_URL", "mini-dokploy.db"),
  port: parseInt(readEnv("PORT", "3000")),
  authSecret: readEnv("BETTER_AUTH_SECRET", "dev-secret-change-in-prod"),
  authUrl: readEnv("BETTER_AUTH_URL", "http://localhost:3000"),

  // Where repos are cloned before building. Defaults to the OS temp dir. `docker build`
  // ships this directory to the daemon as the build context, so it can live in the
  // container's own /tmp — no shared host path needed. Override with BUILD_DIR.
  buildDir: readEnv("BUILD_DIR", os.tmpdir()),

  // Constants
  baseDomain: "127.0.0.1.sslip.io",
  swarmNetwork: "mini-dokploy-net",
  traefikEntrypoint: "web",
} as const
