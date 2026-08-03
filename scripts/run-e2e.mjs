import { spawnSync } from "node:child_process";

import { assertSafeTestDatabase, readEnvFile } from "./test-db-safety.mjs";

const env = { ...process.env, ...readEnvFile(".env") };
const testDatabaseUrl = assertSafeTestDatabase(env);
const testEnv = {
  ...env,
  DATABASE_URL: testDatabaseUrl,
  TEST_DATABASE_URL: testDatabaseUrl,
  APP_ENV: "test",
  NEXTAUTH_URL: "http://127.0.0.1:3000"
};

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: testEnv });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("pnpm", ["run", "db:prepare:e2e"]);
run("pnpm", ["exec", "playwright", "test"]);
