import { execSync } from "node:child_process";
import "dotenv/config";
import pg from "pg";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    e2eDatabaseUrl: string | null;
  }
}

const TEST_DATABASE = "unidocs_test";

// Recreates a separate test database, applies migrations and the dev seed.
// When PostgreSQL is not reachable, e2e tests are skipped (unit tests still run).
export default async function setup(project: TestProject): Promise<void> {
  const mainUrl = process.env.DATABASE_URL;
  if (!mainUrl) {
    project.provide("e2eDatabaseUrl", null);
    return;
  }

  const testUrl = new URL(mainUrl);
  testUrl.pathname = `/${TEST_DATABASE}`;

  const admin = new pg.Client({ connectionString: mainUrl, connectionTimeoutMillis: 3000 });
  try {
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS ${TEST_DATABASE} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${TEST_DATABASE}`);
  } catch (error) {
    console.warn(`PostgreSQL is not reachable, skipping e2e tests: ${error instanceof Error ? error.message : error}`);
    project.provide("e2eDatabaseUrl", null);
    return;
  } finally {
    await admin.end().catch(() => undefined);
  }

  const env = { ...process.env, DATABASE_URL: testUrl.toString(), NODE_ENV: "test" };
  execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "ignore" });
  project.provide("e2eDatabaseUrl", testUrl.toString());
}
