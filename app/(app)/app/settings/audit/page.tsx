import { redirect } from "next/navigation";

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
    <section className="grid gap-6">
      <header>
        <p className="text-sm font-medium text-primary">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Audit log</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Founder-only security trail for account, organization, role, permission, invitation, and
          branding activity.
        </p>
      </header>
      <div className="grid gap-3">
        {events.length ? (
          events.map((event) => (
            <Card key={event.id} className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{event.action}</p>
                  <p className="text-xs text-muted">
                    {event.entityType}
                    {event.entityId ? `:${event.entityId}` : ""}
                  </p>
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
