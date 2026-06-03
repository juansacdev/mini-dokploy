import { describe, it, expect } from "vitest"
import { generateSubdomain, buildTraefikLabels } from "../server/traefik"
import { config } from "../config"

describe("traefik (pure logic)", () => {
  it("generateSubdomain → <serviceName>.<baseDomain>", () => {
    expect(generateSubdomain("my-service")).toBe(`my-service.${config.baseDomain}`)
  })

  it("buildTraefikLabels generates enable + router rule (Host) + service port", () => {
    const serviceName = "my-service"
    const port = 3000
    const labels = buildTraefikLabels({ serviceName, port })

    expect(labels["traefik.enable"]).toBe("true")
    expect(labels[`traefik.http.routers.${serviceName}.rule`]).toContain(`${serviceName}.${config.baseDomain}`)
    expect(labels[`traefik.http.routers.${serviceName}.entrypoints`]).toBe(config.traefikEntrypoint)
    expect(labels[`traefik.http.services.${serviceName}.loadbalancer.server.port`]).toBe(port.toString())
  })

  it("buildTraefikLabels merges customLabels on top", () => {
    const labels = buildTraefikLabels({
      serviceName: "my-service",
      port: 3000,
      customLabels: { "com.example.team": "payments" },
    })

    expect(labels["com.example.team"]).toBe("payments")
  })
})
