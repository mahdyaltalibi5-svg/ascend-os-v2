import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/server/db";

export const databaseUnavailableMessage =
  "Ascend OS is running, but the database is not connected. Check DATABASE_URL, run migrations, and restart the app.";

export function isDatabaseUnavailableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    (error instanceof Error &&
      (error.message.includes("Can't reach database server") ||
        error.message.includes("Environment variable not found: DATABASE_URL")))
  );
}

export async function checkDatabaseConnection() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      message: "Database connected"
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      message: isDatabaseUnavailableError(error)
        ? databaseUnavailableMessage
        : "Database check failed"
    };
  }
}
