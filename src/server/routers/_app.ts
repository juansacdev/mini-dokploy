import { router, publicProcedure } from "../trpc"

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true })),
})

// The type the client imports for end-to-end type-safety. No code is exported, only the type.
export type TAppRouter = typeof appRouter
