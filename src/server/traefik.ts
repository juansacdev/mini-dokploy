import { config } from "../config"
import type { ITraefikLabelsInput } from "./db/definitions/deployment"

export const sanitizeStr = (str: string): string => str
  .normalize('NFD') // normalize the string (to avoid issues with diacritics) just in case
  .replace(/[\u0300-\u036f]/g, '') // remove diacritics
  .replace(/[^a-zA-Z0-9]/g, '-') // replace non-alphanumeric characters with '-'
  .replace(/-+/g, '-') // replace multiple '-' with a single '-'
  .replace(/^-+|-+$/g, '') // remove leading and trailing '-'
  .toLowerCase()

export const generateSubdomain = (serviceName: string): string => `${sanitizeStr(serviceName)}.${config.baseDomain}`

export const buildTraefikLabels = (input: ITraefikLabelsInput): Record<string, string> => {
  const slug = sanitizeStr(input.serviceName)
  const subdomain = generateSubdomain(input.serviceName)

  const baseLabels = {
    ['traefik.enable']: "true", // always enable the router
    [`traefik.http.routers.${slug}.rule`]: `Host(\`${subdomain}\`)`,
    [`traefik.http.routers.${slug}.entrypoints`]: config.traefikEntrypoint,
    [`traefik.http.services.${slug}.loadbalancer.server.port`]: input.port.toString(),
  } as const

  let metadataLabels = {}

  if (input.customLabels) {
    metadataLabels = Object.fromEntries(
      Object.entries(input.customLabels)
        .filter(([key, _value]) => !key.startsWith('traefik.'))
    )
  }

  return {
    ...metadataLabels,
    ...baseLabels, // base labels should always be last to override metadata labels from the user to prevent them from being overridden by the user
  }
}
