import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import net from "node:net";

const envPath = ".env";
const examplePath = ".env.example";

function readEnvFile(path) {
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

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureEnvFile() {
  if (existsSync(envPath)) return;
  const example = existsSync(examplePath) ? readFileSync(examplePath, "utf8") : "";
  const secret = randomBytes(32).toString("base64url");
  const content = example.replace(/NEXTAUTH_SECRET=.*/g, `NEXTAUTH_SECRET="${secret}"`);
  writeFileSync(envPath, content || `NEXTAUTH_SECRET="${secret}"\nAPP_ENV="development"\n`);
  console.log("Created .env from .env.example with a generated development NEXTAUTH_SECRET.");
}

function ensureDevelopmentSecret() {
  if (!existsSync(envPath)) return;
  const envContent = readFileSync(envPath, "utf8");
  if (!envContent.includes("NEXTAUTH_SECRET") || !envContent.includes("replace-with")) return;
  const secret = randomBytes(32).toString("base64url");
  const updated = envContent.replace(/NEXTAUTH_SECRET=.*/g, `NEXTAUTH_SECRET="${secret}"`);
  writeFileSync(envPath, updated);
  console.log("Replaced placeholder NEXTAUTH_SECRET with a generated development secret.");
}

function requireEnv(env) {
  const missing = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET", "APP_ENV"].filter(
    (key) => !env[key] || env[key].includes("replace-with")
  );
  if (missing.length) {
    console.error(`Missing or placeholder environment values: ${missing.join(", ")}`);
    console.error(
      "Edit .env, set DATABASE_URL to a PostgreSQL connection string, then rerun pnpm run setup."
    );
    process.exit(1);
  }
}

function checkDatabaseUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    console.error("DATABASE_URL must be a PostgreSQL connection string for the primary app.");
    process.exit(1);
  }

  const host = parsed.hostname;
  const port = Number(parsed.port || 5432);

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port, timeout: 7000 });
    socket.on("connect", () => {
      socket.end();
      resolve();
    });
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error(`Timed out connecting to ${host}:${port}`));
    });
    socket.on("error", reject);
  });
}

ensureEnvFile();
ensureDevelopmentSecret();
const env = readEnvFile(envPath);
Object.assign(process.env, env);
requireEnv(env);

console.log("Checking PostgreSQL connectivity...");
try {
  await checkDatabaseUrl(env.DATABASE_URL);
} catch (error) {
  console.error("Ascend OS is installed, but the database is not reachable.");
  if (error instanceof Error && error.message) {
    console.error(error.message);
  } else if (typeof error === "object" && error && "code" in error) {
    console.error(`Connection failed with code ${String(error.code)}.`);
  } else {
    console.error("Connection failed before Prisma migrations could run.");
  }
  console.error(
    "Use Docker PostgreSQL, Vercel Postgres, Neon, Supabase, Railway, or another hosted PostgreSQL URL."
  );
  console.error("After DATABASE_URL works, rerun pnpm run setup.");
  process.exit(1);
}

console.log("Generating Prisma Client...");
run("pnpm", ["exec", "prisma", "generate"]);

console.log("Applying migrations...");
run("pnpm", ["exec", "prisma", "migrate", "deploy"]);

console.log("Seeding development data...");
run("pnpm", ["run", "db:seed"]);

console.log("");
console.log("Ascend OS setup complete.");
console.log("Start the app: pnpm run dev");
console.log("Open: http://localhost:3000");
console.log("Founder: founder@ascend.local / AscendDev123!");
console.log("Salesperson: sales@ascend.local / AscendDev123!");
console.log("Mahdy: mahdy@ascend.local / AscendDev123!");
console.log("Logan: logan@ascend.local / AscendDev123!");
