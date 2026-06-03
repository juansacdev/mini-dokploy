import type { CreateNextContextOptions } from "@trpc/server/adapters/next"
import { fromNodeHeaders } from "better-auth/node"
import { db } from "./db"
import { auth } from "./auth"

// Per-request context. Resolves the logged-in user from the Better Auth session.
export const createContext = async (opts: CreateNextContextOptions) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(opts.req.headers) })
  return { db, user: session?.user ?? null }
}

export type TContext = Awaited<ReturnType<typeof createContext>>
