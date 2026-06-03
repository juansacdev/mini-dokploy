import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"
import { config } from "../config"
import * as schema from "./db/schema"

export const auth = betterAuth({
  baseURL: config.authUrl,
  secret: config.authSecret,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: { enabled: true },
  advanced: {
    // Secure cookies require HTTPS. Locally we serve over HTTP (sslip.io), and the
    // container runs in production mode, so without this the session cookie is marked
    // Secure and never sent back → every request is unauthenticated. Enable it only when
    // actually on HTTPS.
    useSecureCookies: config.authUrl.startsWith("https"),
  },
})
