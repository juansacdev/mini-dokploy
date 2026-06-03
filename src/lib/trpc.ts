import { createTRPCNext } from "@trpc/next"
import { httpBatchLink } from "@trpc/client"
import superjson from "superjson"
import type { TAppRouter } from "../server/routers/_app"

const getBaseUrl = (): string => {
  if (typeof window !== "undefined") return "" // the browser uses a relative path
  return `http://localhost:${process.env.PORT ?? 3000}`
}

export const trpc = createTRPCNext<TAppRouter>({
  transformer: superjson,
  config() {
    return {
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    }
  },
  ssr: false,
})
