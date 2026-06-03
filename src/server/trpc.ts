import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import type { TContext } from "./context"

const t = initTRPC.context<TContext>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

// Requires a logged-in user. authn = "is there a ctx.user?"; authz lives in the routers
// (every query is filtered by ctx.user.id).
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" })

  return next({ ctx: { ...ctx, user: ctx.user } })
})
