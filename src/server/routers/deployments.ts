import { router, publicProcedure } from "../trpc"
import { createDeploymentSchema, deploymentIdSchema } from "../db/definitions/deployment"
import * as orchestrator from "../orchestrator"

export const deploymentsRouter = router({
  list: publicProcedure.query(() => orchestrator.list()),

  create: publicProcedure.input(createDeploymentSchema).mutation(({ input }) =>
    orchestrator.deploy(input),
  ),

  redeploy: publicProcedure.input(deploymentIdSchema).mutation(({ input }) =>
    orchestrator.redeploy(input.id),
  ),

  remove: publicProcedure.input(deploymentIdSchema).mutation(({ input }) =>
    orchestrator.remove(input.id),
  ),
})
