import { redirect } from "next/navigation";
import {
  Activity,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Headphones,
  LockKeyhole,
  UsersRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonalCommandCenter } from "@/components/app/personal-command-center";
import { getCurrentSession } from "@/lib/server/auth";
import { requireOrganizationContext } from "@/lib/server/organization";
import { getPersonalCommandData } from "@/lib/server/personal-os";

export default async function AppDashboardPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");

  const context = await requireOrganizationContext(session.user.id);
  const personalCommandData = await getPersonalCommandData({
    userId: session.user.id,
    organizationId: context.organization.id,
    timezone: context.organization.timezone
  });
  const founderLike =
    context.permissions.includes("revenue.view") || context.permissions.includes("audit.view");

  return founderLike ? (
    <FounderDashboard data={personalCommandData} organizationName={context.organization.name} />
  ) : (
    <SalespersonDashboard data={personalCommandData} organizationName={context.organization.name} />
  );
}

function FounderDashboard({
  data,
  organizationName
}: {
  data: Awaited<ReturnType<typeof getPersonalCommandData>>;
  organizationName: string;
}) {
  return (
    <section className="reveal-up grid gap-6">
      <PersonalCommandCenter data={data} organizationName={organizationName} />
    </section>
  );
}

function SalespersonDashboard({
  data,
  organizationName
}: {
  data: Awaited<ReturnType<typeof getPersonalCommandData>>;
  organizationName: string;
}) {
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
        description={`${organizationName} sales access is active. Use the personal command layer while founder-only financial and administrative surfaces stay hidden.`}
        eyebrow="Ascend OS"
        mode="Personal OS"
      />
      <PersonalCommandCenter data={data} organizationName={organizationName} />
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
