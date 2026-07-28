import { redirect } from "next/navigation";
import {
  Activity,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Headphones,
  LockKeyhole,
  Plus,
  ReceiptText,
  Target,
  UsersRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { createRevenuePriorityAction } from "@/app/(app)/app/revenue/actions";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PersonalCommandCenter } from "@/components/app/personal-command-center";
import { formatMoney } from "@/lib/revenue/formatting";
import { getCurrentSession } from "@/lib/server/auth";
import { requireOrganizationContext } from "@/lib/server/organization";
import { getPersonalCommandData } from "@/lib/server/personal-os";
import { getRevenueSummary } from "@/lib/server/revenue";

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
  const revenueSummary = context.permissions.includes("revenue.view")
    ? await getRevenueSummary({
        userId: session.user.id,
        organizationId: context.organization.id,
        timezone: context.organization.timezone
      })
    : null;

  return founderLike ? (
    <FounderDashboard
      data={personalCommandData}
      organizationName={context.organization.name}
      revenueSummary={revenueSummary}
    />
  ) : (
    <SalespersonDashboard data={personalCommandData} organizationName={context.organization.name} />
  );
}

function FounderDashboard({
  data,
  organizationName,
  revenueSummary
}: {
  data: Awaited<ReturnType<typeof getPersonalCommandData>>;
  organizationName: string;
  revenueSummary: Awaited<ReturnType<typeof getRevenueSummary>> | null;
}) {
  return (
    <section className="reveal-up grid gap-6">
      <PersonalCommandCenter data={data} organizationName={organizationName} />
      {revenueSummary ? <FounderRevenueSummary summary={revenueSummary} /> : null}
    </section>
  );
}

function FounderRevenueSummary({
  summary
}: {
  summary: Awaited<ReturnType<typeof getRevenueSummary>>;
}) {
  const recommendation = summary.topRecommendation;
  return (
    <Card className="scan-line">
      <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr] xl:items-center">
        <div>
          <p className="text-sm font-semibold text-primary">Revenue pulse</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            {summary.primaryGoal
              ? `${formatMoney(summary.scorecards.collectedCents)} of ${formatMoney(
                  summary.primaryGoal.targetAmountCents
                )} collected`
              : "Set the monthly revenue goal"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {summary.progress
              ? `${formatMoney(summary.progress.remainingAmountCents)} gap. ${summary.progress.remainingDays} days remaining.`
              : "The full Revenue Command Center will start pacing once a cash-collected goal exists."}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniRevenueStat
            icon={ReceiptText}
            label="Outstanding"
            value={formatMoney(summary.scorecards.outstandingCents)}
          />
          <MiniRevenueStat
            icon={Target}
            label="MRR"
            value={formatMoney(summary.scorecards.mrrCents)}
          />
          <MiniRevenueStat
            icon={Activity}
            label="Expected"
            value={formatMoney(summary.forecast.expectedAmountCents)}
          />
        </div>
      </div>
      {recommendation ? (
        <div className="mt-5 rounded-md border border-border bg-background/35 p-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-semibold">{recommendation.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{recommendation.reason}</p>
            </div>
            <form action={createRevenuePriorityAction}>
              <input name="title" type="hidden" value={recommendation.title} />
              <input name="reason" type="hidden" value={recommendation.reason} />
              <input name="impactCents" type="hidden" value={recommendation.estimatedImpactCents} />
              <input name="entityType" type="hidden" value={recommendation.entityType ?? ""} />
              <input name="entityId" type="hidden" value={recommendation.entityId ?? ""} />
              <Button size="sm" type="submit" variant="secondary">
                <Plus aria-hidden className="h-4 w-4" />
                Add priority
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function MiniRevenueStat({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background/35 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted">
        <Icon aria-hidden className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
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
