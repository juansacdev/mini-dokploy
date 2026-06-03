import type { AppType } from "next/app"
import { trpc } from "../lib/trpc"

const App: AppType = ({ Component, pageProps }) => {
  return <Component {...pageProps} />
}

// withTRPC wraps the app with the React Query provider + the tRPC client.
export default trpc.withTRPC(App)
