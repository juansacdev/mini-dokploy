import type { CreateNextContextOptions } from "@trpc/server/adapters/next"
import { db } from "./db"

// Per-request context. Exposes the database handle to every procedure.
export const createContext = async (_opts: CreateNextContextOptions) => {
  return { db }
}

export type TContext = Awaited<ReturnType<typeof createContext>>
