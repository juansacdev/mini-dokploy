import type { CreateNextContextOptions } from "@trpc/server/adapters/next"

// Per-request context. Empty for now — request-scoped state is added as features land.
export const createContext = async (_opts: CreateNextContextOptions) => {
  return {}
}

export type TContext = Awaited<ReturnType<typeof createContext>>
