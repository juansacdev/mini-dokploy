import { describe, it, expect } from "vitest"
import path from "node:path"
import { buildServiceCreateArgs, buildImageArgs } from "../server/orchestrator"
import { IServiceCreateArgs } from '../server/db/definitions/deployment'

describe("orchestrator — buildServiceCreateArgs (pure)", () => {
  const base: IServiceCreateArgs = {
    serviceName: "app-my-store",
    image: "app-my-store:latest",
    port: 3000,
    customLabels: {
      "com.example.team": "payments",
    }
  }

  it("starts with the `service create` subcommand", () => {
    const args = buildServiceCreateArgs(base)
    expect(args.slice(0, 2)).toEqual(["service", "create"])
  })

  it("includes --name <serviceName> and --network <network>", () => {
    const args = buildServiceCreateArgs(base)
    expect(args[args.indexOf("--name") + 1]).toBe("app-my-store")
    expect(args[args.indexOf("--network") + 1]).toBe("mini-dokploy-net")
  })

  it("emits one --label flag per label, formatted key=value", () => {
    const BASE_LABEL_FLAGS = 4 // reserved traefik labels

    const args = buildServiceCreateArgs(base)
    const labelFlags = args.filter((arg) => arg === "--label")
    expect(labelFlags).toHaveLength(Object.keys(base.customLabels ?? {}).length + BASE_LABEL_FLAGS)
    expect(args).toContain("com.example.team=payments")
  })

  it("puts the image as the LAST argument (after all flags)", () => {
    const args = buildServiceCreateArgs(base)
    expect(args[args.length - 1]).toBe(base.image)
  })
})

describe("orchestrator — buildImageArgs (pure)", () => {
  // The only non-trivial behavior: --file is resolved RELATIVE TO the context dir
  // (docker resolves -f against the cwd otherwise — a real gotcha this encodes).
  it("resolves --file relative to the context dir", () => {
    const args = buildImageArgs({
      dockerfilePath: "Dockerfile",
      imageTag: "widget:latest",
      contextDir: "/tmp/widget",
    })
    expect(args[args.indexOf("--file") + 1]).toBe(path.join("/tmp/widget", "Dockerfile"))
  })
})
