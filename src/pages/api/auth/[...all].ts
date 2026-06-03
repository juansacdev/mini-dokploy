import { toNodeHandler } from "better-auth/node"
import { auth } from "../../../server/auth"

// Better Auth reads the raw request body, so Next's body parser must be off.
export const config = {
  api: { bodyParser: false },
}

export default toNodeHandler(auth.handler)
