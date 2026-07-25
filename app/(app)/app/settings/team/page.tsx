import { redirect } from "next/navigation";
import { Building2, Send, UsersRound } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentSession } from "@/lib/server/auth";
import { getUserOrganizations, requirePermission } from "@/lib/server/organization";

export default async function TeamSettingsPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");

  const context = await requirePermission(session.user.id, "team.view");
  const memberships = await getUserOrganizations(session.user.id);

  return (
    <section className="reveal-up grid gap-6">
      <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Settings</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal md:text-5xl">
            Team and organization
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            This foundation verifies team access and models invitations without presenting
            unfinished administration as complete.
          </p>
        </div>
        <div className="w-fit rounded-md border border-border bg-surface/75 px-3 py-2 text-xs font-semibold uppercase text-muted shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)]">
          Settings layer
        </div>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-primary/35 bg-primary/15 text-primary">
              <Building2 aria-hidden className="h-5 w-5" />
            </div>
            <CardTitle>{context.organization.name}</CardTitle>
            <CardDescription>
              Active organization: {context.organization.timezone}. Branding is stored as data and
              can be expanded into full white-label controls later.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-border-strong bg-surface-elevated text-primary">
              <UsersRound aria-hidden className="h-5 w-5" />
            </div>
            <CardTitle>Your memberships</CardTitle>
            <CardDescription>
              {memberships.map((membership) => membership.organization.name).join(", ")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
      <EmptyState
        title="Invitation workflow modeled"
        description="Founders can create invitation records through the API. Email delivery and acceptance UI are the next implementation steps."
      />
      <Card className="scan-line">
        <CardHeader>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-border-strong bg-surface-elevated text-primary">
            <Send aria-hidden className="h-5 w-5" />
          </div>
          <CardTitle>Next invitation step</CardTitle>
          <CardDescription>
            Add delivery, acceptance, and role assignment UI after production email service and
            transactional templates are selected.
          </CardDescription>
        </CardHeader>
      </Card>
    </section>
  );
}
