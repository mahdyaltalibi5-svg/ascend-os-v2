import { redirect } from "next/navigation";

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
    <section className="grid gap-6">
      <header>
        <p className="text-sm font-medium text-primary">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Team and organization</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          This foundation verifies team access and models invitations without presenting unfinished
          administration as complete.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{context.organization.name}</CardTitle>
            <CardDescription>
              Active organization: {context.organization.timezone}. Branding is stored as data and
              can be expanded into full white-label controls later.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
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
    </section>
  );
}
