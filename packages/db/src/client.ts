import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

// Connection pool for server-side usage
// Uses the pooler URL from Supabase (port 6543) for connection pooling
const connectionString = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/syncora";

// For migrations use the direct URL (port 5432)
const migrationConnectionString = process.env.DIRECT_URL ?? connectionString;

// Singleton pattern to prevent multiple connections in development
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn =
  globalForDb.conn ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema, logger: process.env.NODE_ENV === "development" });

export type DB = typeof db;

// Export migration client (use direct connection, bypass pooler)
export const migrationClient = postgres(migrationConnectionString, { max: 1 });
