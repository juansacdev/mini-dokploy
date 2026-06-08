import { z } from "zod"

// user input
export const createDeploymentSchema = z.object({
  serviceName: z.string().min(1).max(15),
  repositoryUrl: z.url(),
  dockerfilePath: z.string().min(1),
  branch: z.string(),
  port: z.number().int().positive().max(65535),
  customLabels: z.record(z.string(), z.string()).refine(
    (labels) => Object.keys(labels).every(key => !key.startsWith('traefik.')),
    {
      message: 'Custom labels must not start with "traefik." (reserved by the platform)'
    }
  ).optional(),
})
export type TCreateDeploymentInput = z.infer<typeof createDeploymentSchema>

export const deploymentIdSchema = z.object({ id: z.string().min(1) })
export type TDeploymentIdInput = z.infer<typeof deploymentIdSchema>

/** Pure input for Traefik label generation (no Docker, deterministic). */
export interface ITraefikLabelsInput {
  serviceName: string
  port: number
  customLabels?: Record<string, string>
}

/** Pure input for building the `docker service create` argument array. */
export interface IServiceCreateArgs {
  serviceName: string
  port: number
  image: string
  customLabels?: Record<string, string>
}
