// Standalone migration runner (plain ESM — no TS, no drizzle-kit needed at runtime).
// Runs the SQL migrations in ./drizzle against the DB at DATABASE_URL.
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"

const url = process.env.DATABASE_URL ?? "mini-dokploy.db"
const db = drizzle(new Database(url))

migrate(db, { migrationsFolder: "drizzle" })
console.log(`[migrate] applied migrations to ${url}`)
