import { existsSync, readFileSync } from "node:fs";

export function readEnvFile(path = ".env") {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        return [key, rest.join("=").replace(/^"|"$/g, "")];
      })
  );
}

export function assertSafeTestDatabase(env) {
  const databaseUrl = env.DATABASE_URL;
  const testDatabaseUrl = env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is required for database-backed test runs.");
  }
  if (databaseUrl && databaseUrl === testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL must be separate from DATABASE_URL.");
  }
  if (env.APP_ENV === "production" || env.NODE_ENV === "production") {
    throw new Error("Refusing to run database tests in production.");
  }

  const parsed = new URL(testDatabaseUrl);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("TEST_DATABASE_URL must be a PostgreSQL connection string.");
  }
  const databaseName = parsed.pathname.replace(/^\//, "");
  if (!/(test|e2e|ci)/i.test(databaseName)) {
    throw new Error("TEST_DATABASE_URL database name must include test, e2e, or ci.");
  }
  return testDatabaseUrl;
}
