import { notFound } from "next/navigation";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { checkDatabaseConnection } from "@/lib/server/database";
import { prisma } from "@/lib/server/db";
import { getEnvStatus, getPublicAppEnvironment } from "@/lib/server/env";

export default async function DiagnosticsPage() {
  if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") {
    notFound();
  }

  const env = getEnvStatus();
  const database = await checkDatabaseConnection();
  const counts = database.ok
    ? await prisma.$transaction([
        prisma.user.count({
          where: { normalizedEmail: { in: ["founder@ascend.local", "sales@ascend.local"] } }
        }),
        prisma.role.count({ where: { key: { in: ["founder", "salesperson"] } } }),
        prisma.permission.count()
      ])
    : [0, 0, 0];

  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground">
      <section className="mx-auto grid w-full max-w-3xl gap-4">
        <header>
          <p className="text-sm font-medium text-primary">Development only</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Ascend OS diagnostics</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            This page shows setup status without exposing secrets, tokens, or connection strings.
          </p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
            <CardDescription>
              {getPublicAppEnvironment()} ·{" "}
              {env.ok ? "Required values are set" : "Missing setup values"}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
            <CardDescription>
              {database.ok ? `Connected in ${database.latencyMs}ms` : database.message}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Seed data</CardTitle>
            <CardDescription>
              Seed users: {counts[0]} · Default roles: {counts[1]} · Permissions: {counts[2]}
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </main>
  );
}
