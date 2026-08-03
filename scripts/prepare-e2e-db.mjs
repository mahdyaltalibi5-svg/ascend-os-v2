import { spawnSync } from "node:child_process";

import { assertSafeTestDatabase, readEnvFile } from "./test-db-safety.mjs";

const env = { ...process.env, ...readEnvFile(".env") };
const testDatabaseUrl = assertSafeTestDatabase(env);
const testEnv = {
  ...env,
  DATABASE_URL: testDatabaseUrl,
  TEST_DATABASE_URL: testDatabaseUrl,
  APP_ENV: "test",
  NODE_ENV: env.NODE_ENV === "production" ? "test" : env.NODE_ENV
};

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: testEnv });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Preparing dedicated E2E PostgreSQL database...");
run("pnpm", ["exec", "prisma", "migrate", "reset", "--force", "--skip-seed"]);
run("pnpm", ["run", "db:seed"]);
console.log("E2E database is migrated and seeded.");
