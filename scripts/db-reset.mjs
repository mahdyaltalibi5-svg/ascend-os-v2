import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

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

Object.assign(process.env, readEnvFile(".env"));

if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") {
  console.error("Refusing to reset the database in production.");
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Resetting the development database. This is destructive.");
run("pnpm", ["exec", "prisma", "migrate", "reset", "--force", "--skip-seed"]);
run("pnpm", ["run", "db:seed"]);
