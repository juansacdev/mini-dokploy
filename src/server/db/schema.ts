import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

// deployment
export const DeploymentStatus = {
  DEPLOYING: "DEPLOYING",
  DEPLOYED: "DEPLOYED",
  FAILED: "FAILED",
} as const

export type TDeploymentStatus = (typeof DeploymentStatus)[keyof typeof DeploymentStatus]

export const deployment = sqliteTable("deployments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  repositoryUrl: text("repository_url").notNull(),
  dockerfile: text("dockerfile").notNull(),
  port: integer("port").notNull(),
  subdomain: text("subdomain").notNull(),
  serviceName: text("service_name").notNull(),
  customLabels: text("custom_labels", { mode: "json" }).$type<Record<string, string>>(),
  status: text("status")
    .notNull()
    .default(DeploymentStatus.DEPLOYING)
    .$type<TDeploymentStatus>(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

// db types
export type TDeployment = typeof deployment.$inferSelect
export type TNewDeployment = typeof deployment.$inferInsert
