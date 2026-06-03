import { createAuthClient } from "better-auth/react"

// baseURL is inferred from window.location (same-origin), so it works on both
// localhost and the dokploy.* subdomain without changes.
export const authClient = createAuthClient()
