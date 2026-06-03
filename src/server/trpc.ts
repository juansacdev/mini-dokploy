import { initTRPC } from "@trpc/server"
import superjson from "superjson"
import type { TContext } from "./context"

const t = initTRPC.context<TContext>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure
