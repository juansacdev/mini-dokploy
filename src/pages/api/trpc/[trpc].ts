import { createNextApiHandler } from "@trpc/server/adapters/next"
import { appRouter } from "../../../server/routers/_app"
import { createContext } from "../../../server/context"

// A single HTTP endpoint (/api/trpc/*) serves ALL procedures. tRPC batches them.
export default createNextApiHandler({
  router: appRouter,
  createContext,
})
