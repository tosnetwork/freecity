import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import { createPool, type Pool } from "./db.js";

/**
 * Test-only helper: creates a scratch database, applies the repository
 * migrations to it, and tears it down afterwards. Kept in src for typecheck
 * coverage; imported only from tests.
 */

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "migrations",
);

const ADMIN_URL =
  process.env["DATABASE_URL"] ?? "postgres://freecity:freecity@localhost:5433/freecity";

export interface TestDatabase {
  pool: Pool;
  url: string;
  drop: () => Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const name = `freecity_test_${randomBytes(6).toString("hex")}`;
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();

  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  const databaseUrl = url.toString();

  // Lazy so that importing the package index never loads this dev-only
  // dependency in a production process.
  const { runner: runMigrations } = await import("node-pg-migrate");
  await runMigrations({
    databaseUrl,
    dir: MIGRATIONS_DIR,
    direction: "up",
    migrationsTable: "pgmigrations",
    log: () => {},
  });

  const pool = createPool(databaseUrl);
  return {
    pool,
    url: databaseUrl,
    drop: async () => {
      await pool.end();
      const cleaner = new pg.Client({ connectionString: ADMIN_URL });
      await cleaner.connect();
      await cleaner.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await cleaner.end();
    },
  };
}
