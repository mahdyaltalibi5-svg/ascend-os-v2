import { redirect } from "next/navigation";
import { FileClock, ShieldCheck } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/organization";

export default async function AuditPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");

  const context = await requirePermission(session.user.id, "audit.view");
  const events = await prisma.auditEvent.findMany({
    where: { organizationId: context.organization.id },
    orderBy: { createdAt: "desc" },
    take: 25
  });

  return (
    <section className="reveal-up grid gap-6">
      <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Settings</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal md:text-5xl">Audit log</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Founder-only security trail for account, organization, role, permission, invitation, and
            branding activity.
          </p>
        </div>
        <div className="w-fit rounded-md border border-border bg-surface/75 px-3 py-2 text-xs font-semibold uppercase text-muted shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)]">
          Founder only
        </div>
      </header>
      <div className="grid gap-3">
        {events.length ? (
          events.map((event) => (
            <Card key={event.id} className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border-strong bg-surface-elevated text-primary">
                    <FileClock aria-hidden className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{event.action}</p>
                    <p className="text-xs text-muted">
                      {event.entityType}
                      {event.entityId ? `:${event.entityId}` : ""}
                    </p>
                  </div>
                </div>
                <time className="text-xs text-muted" dateTime={event.createdAt.toISOString()}>
                  {event.createdAt.toLocaleString()}
                </time>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <CardHeader>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-primary/35 bg-primary/15 text-primary">
                <ShieldCheck aria-hidden className="h-5 w-5" />
              </div>
              <CardTitle>No audit events yet</CardTitle>
              <CardDescription>
                Major account and organization events will appear here as they occur.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </section>
  );
}
