import { router, protectedProcedure } from "../trpc"
import { createDeploymentSchema, deploymentIdSchema } from "../db/definitions/deployment"
import * as orchestrator from "../orchestrator"

// Every procedure is protected and scoped to the logged-in user (data-layer multi-tenancy).
export const deploymentsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    orchestrator.list(ctx.user.id)
  ),

  create: protectedProcedure.input(createDeploymentSchema).mutation(({ ctx, input }) =>
    orchestrator.deploy(input, ctx.user.id),
  ),

  redeploy: protectedProcedure.input(deploymentIdSchema).mutation(({ ctx, input }) =>
    orchestrator.redeploy(input.id, ctx.user.id),
  ),

  remove: protectedProcedure.input(deploymentIdSchema).mutation(({ ctx, input }) =>
    orchestrator.remove(input.id, ctx.user.id),
  ),
})
