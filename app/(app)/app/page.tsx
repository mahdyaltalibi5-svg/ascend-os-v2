import { redirect } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/lib/server/auth";
import { requireOrganizationContext } from "@/lib/server/organization";

export default async function AppDashboardPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");

  const context = await requireOrganizationContext(session.user.id);
  const founderLike =
    context.permissions.includes("revenue.view") || context.permissions.includes("audit.view");

  return founderLike ? (
    <FounderDashboard organizationName={context.organization.name} />
  ) : (
    <SalespersonDashboard organizationName={context.organization.name} />
  );
}

function FounderDashboard({ organizationName }: { organizationName: string }) {
  const tiles = [
    ["Revenue goal", "Revenue goals will be configured in Milestone 2."],
    ["Cash collected", "Connect Stripe to display cash collected."],
    ["MRR", "Subscription revenue will appear after billing is connected."],
    ["Calls today", "Sales activity will appear after the sales workspace is enabled."],
    ["Meetings booked", "Calendar and sales tracking arrive in a later milestone."],
    ["Meetings held", "Meeting outcomes will appear after sales workflows are enabled."],
    ["Deals closed", "Closed revenue will appear after the CRM and Stripe modules exist."],
    ["Churn", "Churn tracking will be configured after client lifecycle data exists."]
  ];

  return (
    <section className="grid gap-6">
      <PageHeader
        title="Founder Command Center"
        description={`${organizationName} is ready for secure foundation work. Live metrics are intentionally deferred.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(([title, description]) => (
          <EmptyState key={title} title={title} description={description} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <EmptyState
          title="Today's priorities"
          description="Priorities will be configured in Milestone 2."
        />
        <EmptyState
          title="Founder brief"
          description="Agent-authored briefs arrive after agent orchestration is built."
        />
        <EmptyState
          title="Approval inbox"
          description="Approvals will appear when workflows create reviewable actions."
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            Audit-backed organization events are available in Settings for users with audit access.
          </CardDescription>
        </CardHeader>
      </Card>
    </section>
  );
}

function SalespersonDashboard({ organizationName }: { organizationName: string }) {
  const tiles = [
    ["Today's queue", "Lead queues will appear after the sales workspace is enabled."],
    ["Calls completed", "Personal call activity will appear after the dialer is enabled."],
    ["Conversations", "Conversation tracking arrives with the sales workspace."],
    ["Appointments booked", "Appointments will appear after calendar workflows exist."],
    ["Follow-ups", "Follow-up tasks arrive with the CRM workflow."],
    ["Upcoming appointments", "Calendar-backed appointments are deferred to a later milestone."],
    [
      "Personal performance",
      "Personal sales performance will appear after real activity data exists."
    ]
  ];

  return (
    <section className="grid gap-6">
      <PageHeader
        title="Sales Command Center"
        description={`${organizationName} sales access is active. Founder-only financial and administrative surfaces are hidden.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map(([title, description]) => (
          <EmptyState key={title} title={title} description={description} />
        ))}
      </div>
    </section>
  );
}

function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="max-w-3xl">
      <p className="text-sm font-medium text-primary">Ascend OS</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted md:text-base">{description}</p>
    </header>
  );
}
