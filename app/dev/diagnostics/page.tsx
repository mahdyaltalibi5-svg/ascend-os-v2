import { notFound } from "next/navigation";
import { Database, Gauge, KeyRound } from "lucide-react";

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
    <main className="relative min-h-dvh overflow-hidden bg-background px-4 py-10 text-foreground">
      <div aria-hidden className="ascend-grid absolute inset-0" />
      <div aria-hidden className="ascend-noise absolute inset-0" />
      <section className="reveal-up relative mx-auto grid w-full max-w-4xl gap-4">
        <header className="mb-2">
          <p className="text-sm font-semibold text-primary">Development only</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal md:text-5xl">
            Ascend OS diagnostics
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            This page shows setup status without exposing secrets, tokens, or connection strings.
          </p>
        </header>
        <Card>
          <CardHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-primary/35 bg-primary/15 text-primary">
              <KeyRound aria-hidden className="h-5 w-5" />
            </div>
            <CardTitle>Environment</CardTitle>
            <CardDescription>
              {getPublicAppEnvironment()} ·{" "}
              {env.ok ? "Required values are set" : "Missing setup values"}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-border-strong bg-surface-elevated text-primary">
              <Database aria-hidden className="h-5 w-5" />
            </div>
            <CardTitle>Database</CardTitle>
            <CardDescription>
              {database.ok ? `Connected in ${database.latencyMs}ms` : database.message}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-border-strong bg-surface-elevated text-primary">
              <Gauge aria-hidden className="h-5 w-5" />
            </div>
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
