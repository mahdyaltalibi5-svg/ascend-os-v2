import { NextResponse } from "next/server";

import { checkDatabaseConnection } from "@/lib/server/database";
import { getEnvStatus, getPublicAppEnvironment } from "@/lib/server/env";

export async function GET() {
  const env = getEnvStatus();
  const database = await checkDatabaseConnection();
  const healthy = env.ok && database.ok;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "unavailable",
      app: "Ascend OS",
      version: process.env.npm_package_version ?? "0.1.0",
      environment: getPublicAppEnvironment(),
      timestamp: new Date().toISOString(),
      env: {
        ok: env.ok,
        missing: env.missing,
        placeholders: env.placeholders
      },
      database
    },
    { status: healthy ? 200 : 503 }
  );
}
