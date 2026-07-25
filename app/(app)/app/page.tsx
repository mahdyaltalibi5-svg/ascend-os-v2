import { redirect } from "next/navigation";
import {
  Activity,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Headphones,
  LineChart,
  LockKeyhole,
  RadioTower,
  TrendingUp,
  UsersRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  const tiles: Array<[string, string, LucideIcon]> = [
    ["Revenue goal", "Revenue goals will be configured in Milestone 2.", CircleDollarSign],
    ["Cash collected", "Connect Stripe to display cash collected.", TrendingUp],
    ["MRR", "Subscription revenue will appear after billing is connected.", LineChart],
    ["Calls today", "Sales activity will appear after the sales workspace is enabled.", Headphones],
    ["Meetings booked", "Calendar and sales tracking arrive in a later milestone.", CalendarCheck2],
    [
      "Meetings held",
      "Meeting outcomes will appear after sales workflows are enabled.",
      UsersRound
    ],
    [
      "Deals closed",
      "Closed revenue will appear after the CRM and Stripe modules exist.",
      CheckCircle2
    ],
    ["Churn", "Churn tracking will be configured after client lifecycle data exists.", Activity]
  ];

  return (
    <section className="reveal-up grid gap-6">
      <PageHeader
        title="Founder Command Center"
        description={`${organizationName} is ready for secure foundation work. Live metrics are intentionally deferred.`}
        eyebrow="Ascend OS"
        mode="Founder workspace"
      />
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="scan-line min-h-72 p-0">
          <div className="grid h-full gap-6 p-5 md:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-between gap-8">
              <div>
                <p className="text-sm font-semibold text-primary">Operating layer</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-normal text-foreground">
                  Foundation is online. Metrics are waiting for real sources.
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  The command center is scoped to {organizationName}, with permission-aware
                  navigation and audit-ready organization actions.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Tenant scoped", "Founder access", "Audit aware"].map((item) => (
                  <span
                    className="rounded-sm border border-border bg-background/45 px-2.5 py-1 text-xs font-medium text-muted"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid content-end gap-3">
              {["Stripe", "Sales workspace", "Client lifecycle"].map((source, index) => (
                <div className="rounded-md border border-border bg-background/35 p-3" key={source}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{source}</p>
                    <span className="text-xs text-muted-soft">Deferred</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${28 + index * 17}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="min-h-72">
          <CardHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-primary/35 bg-primary/15 text-primary">
              <RadioTower aria-hidden className="h-5 w-5" />
            </div>
            <CardTitle>Control posture</CardTitle>
            <CardDescription>
              Founder-only financial and administrative surfaces are visible here because this role
              has the required permissions.
            </CardDescription>
          </CardHeader>
          <div className="grid gap-2 text-sm text-muted">
            {["Organization verified", "Permission set loaded", "Future modules locked"].map(
              (item) => (
                <div
                  className="flex items-center gap-2 rounded-md border border-border bg-background/35 px-3 py-2"
                  key={item}
                >
                  <CheckCircle2 aria-hidden className="h-4 w-4 text-success" />
                  {item}
                </div>
              )
            )}
          </div>
        </Card>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(([title, description, Icon]) => (
          <MetricShell key={title} title={title} description={description} icon={Icon} />
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
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-border-strong bg-surface-elevated text-primary">
            <ClipboardList aria-hidden className="h-5 w-5" />
          </div>
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
  const tiles: Array<[string, string, LucideIcon]> = [
    [
      "Today's queue",
      "Lead queues will appear after the sales workspace is enabled.",
      ClipboardList
    ],
    [
      "Calls completed",
      "Personal call activity will appear after the dialer is enabled.",
      Headphones
    ],
    ["Conversations", "Conversation tracking arrives with the sales workspace.", UsersRound],
    [
      "Appointments booked",
      "Appointments will appear after calendar workflows exist.",
      CalendarCheck2
    ],
    ["Follow-ups", "Follow-up tasks arrive with the CRM workflow.", CheckCircle2],
    [
      "Upcoming appointments",
      "Calendar-backed appointments are deferred to a later milestone.",
      CalendarCheck2
    ],
    [
      "Personal performance",
      "Personal sales performance will appear after real activity data exists.",
      Activity
    ]
  ];

  return (
    <section className="reveal-up grid gap-6">
      <PageHeader
        title="Sales Command Center"
        description={`${organizationName} sales access is active. Founder-only financial and administrative surfaces are hidden.`}
        eyebrow="Ascend OS"
        mode="Sales workspace"
      />
      <Card className="scan-line">
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-primary">Permission-shaped workspace</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">
              Sales tools are ready to receive real queues.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              The salesperson shell exposes sales-facing modules while keeping revenue, organization
              administration, and audit controls out of view.
            </p>
          </div>
          <div className="flex min-w-48 items-center gap-3 rounded-md border border-border bg-background/35 p-3">
            <LockKeyhole aria-hidden className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Restricted</p>
              <p className="text-xs text-muted">Founder-only data hidden</p>
            </div>
          </div>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map(([title, description, Icon]) => (
          <MetricShell key={title} title={title} description={description} icon={Icon} />
        ))}
      </div>
    </section>
  );
}

function MetricShell({
  title,
  description,
  icon: Icon
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="group min-h-44">
      <CardHeader>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border-strong bg-surface-elevated text-primary shadow-[inset_0_1px_0_hsl(var(--foreground)/0.08)] transition duration-200 group-hover:border-primary/45">
            <Icon aria-hidden className="h-5 w-5" />
          </div>
          <span className="rounded-sm border border-border bg-background/45 px-2 py-1 text-xs font-medium text-muted-soft">
            Not connected
          </span>
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function PageHeader({
  title,
  description,
  eyebrow,
  mode
}: {
  title: string;
  description: string;
  eyebrow: string;
  mode: string;
}) {
  return (
    <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-normal text-foreground md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted md:text-base">{description}</p>
      </div>
      <div className="w-fit rounded-md border border-border bg-surface/75 px-3 py-2 text-xs font-semibold uppercase text-muted shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)]">
        {mode}
      </div>
    </header>
  );
}
