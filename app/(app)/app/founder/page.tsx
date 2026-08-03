import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, BarChart3, LockOpen, SlidersHorizontal, Target } from "lucide-react";

import {
  releaseLeadLockAction,
  reviewOwnerReachScoreAction
} from "@/app/(app)/app/founder/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/lib/server/auth";
import { getCallDeskContext, getFounderDashboardData } from "@/lib/server/call-desk";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function FounderPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");
  const context = await getCallDeskContext(session.user.id);
  if (!context.permissions.includes("analytics.company")) redirect("/app");

  const params = (await searchParams) ?? {};
  const preset = scalar(params.range) || "today";
  const range = dateRange(preset, scalar(params.from), scalar(params.to));
  const data = await getFounderDashboardData(context, range);
  const metrics = data.metrics;
  const leadOps = {
    callReady: data.leads.filter((lead) => lead.callReady).length,
    assigned: data.leads.filter((lead) => lead.assignedUserId).length,
    unassigned: data.leads.filter((lead) => !lead.assignedUserId).length,
    awaitingVerification: data.leads.filter((lead) => !lead.callReady).length,
    suppressed: data.suppressions.length,
    wrongNumbers: data.leads.filter((lead) => lead.wrongNumber).length,
    doNotCall: data.leads.filter((lead) => lead.doNotCall).length,
    averageOwnerReach: data.leads.length
      ? Math.round(
          data.leads.reduce((total, lead) => total + lead.ownerReachScore, 0) / data.leads.length
        )
      : 0,
    ownerDirect: data.leads.filter((lead) => lead.phoneType === "direct_owner").length,
    ownerOperated: data.leads.filter((lead) => lead.phoneType === "owner_operated_main_line")
      .length,
    officeLines: data.leads.filter((lead) => lead.phoneType === "office_line").length,
    exhausted: data.leads.filter(
      (lead) => lead.operationalStatus === "attempted" && !lead.nextFollowUpAt
    ).length
  };
  const callsByHour = bucket(data.calls, (call) =>
    String(call.startedAt.getHours()).padStart(2, "0")
  );
  const callsByTrade = bucket(data.calls, (call) => call.leadBusiness.trade ?? "Unknown");
  const callsByCaller = bucket(
    data.calls,
    (call) => call.caller?.name ?? call.caller?.email ?? "Unknown"
  );
  const attention = [
    ...data.callbacks
      .filter((callback) => callback.effectiveStatus === "overdue")
      .slice(0, 4)
      .map((callback) => ({
        title: `Overdue callback: ${callback.leadBusiness.businessName}`,
        href: `/app/sales/leads/${callback.leadBusinessId}`
      })),
    ...data.leads
      .filter(
        (lead) =>
          ["interested", "owner_reached"].includes(lead.operationalStatus) && !lead.nextFollowUpAt
      )
      .slice(0, 4)
      .map((lead) => ({
        title: `Needs next action: ${lead.businessName}`,
        href: `/app/sales/leads/${lead.id}`
      })),
    ...data.leads
      .filter((lead) => lead.callAttempts.length === 0 && lead.ownerReachScore >= 75)
      .slice(0, 4)
      .map((lead) => ({
        title: `High-score untouched lead: ${lead.businessName}`,
        href: `/app/sales/leads/${lead.id}`
      }))
  ].slice(0, 8);

  return (
    <section className="grid gap-5">
      <Card className="scan-line">
        <CardHeader>
          <CardTitle>Founder dashboard</CardTitle>
          <CardDescription>
            Company-wide sales operations for verified calling, callbacks, appointments, locks, and
            score review.
          </CardDescription>
        </CardHeader>
        <form className="flex flex-wrap gap-2" method="get">
          {["today", "yesterday", "this-week", "last-week", "this-month"].map((option) => (
            <button
              className={`rounded-md border px-3 py-2 text-sm ${
                preset === option
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted"
              }`}
              key={option}
              name="range"
              type="submit"
              value={option}
            >
              {option.replace(/-/g, " ")}
            </button>
          ))}
          <input className="ascend-input max-w-40" name="from" type="date" />
          <input className="ascend-input max-w-40" name="to" type="date" />
          <Button type="submit" variant="secondary">
            Custom
          </Button>
        </form>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Dials" value={metrics.dialsToday} />
        <Metric title="Owners reached" value={metrics.ownersReached} />
        <Metric title="Full pitches" value={metrics.fullPitches} />
        <Metric title="Meetings booked" value={metrics.meetingsBooked} />
        <Metric title="Owner-reach rate" value={`${metrics.ownerReachRate}%`} />
        <Metric title="Dial-to-booking" value={`${metrics.dialToBookingRate}%`} />
        <Metric title="Conversation booking" value={`${metrics.ownerConversationToBookingRate}%`} />
        <Metric title="Avg call duration" value={`${metrics.averageCallDuration}s`} />
        <Metric title="Receptionist rate" value={`${metrics.receptionistRate}%`} />
        <Metric title="Wrong-number rate" value={`${metrics.wrongNumberRate}%`} />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team comparison</CardTitle>
            <CardDescription>Mahdy and Logan activity in the selected range.</CardDescription>
          </CardHeader>
          <div className="grid gap-3">
            {data.team.map((member) => (
              <div
                className="rounded-md border border-border bg-background/35 p-3"
                key={member.userId}
              >
                <p className="font-semibold">{member.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {member.calls} calls · {member.ownersReached} owner conversations ·{" "}
                  {member.meetingsBooked} meetings · {member.overdueCallbacks} overdue callbacks ·{" "}
                  {member.queueRemaining} queued
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attention center</CardTitle>
            <CardDescription>Items that need a decision or next action.</CardDescription>
          </CardHeader>
          <div className="grid gap-2">
            {attention.length ? (
              attention.map((item) => (
                <Link
                  className="rounded-md border border-border bg-background/35 p-3 text-sm hover:border-primary"
                  href={item.href}
                  key={item.title}
                >
                  <AlertTriangle aria-hidden className="mr-2 inline h-4 w-4 text-danger" />
                  {item.title}
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted">No urgent items right now.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Lead operations</CardTitle>
            <CardDescription>Queue health, suppression, and phone-type quality.</CardDescription>
          </CardHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(leadOps).map(([key, value]) => (
              <Metric compact key={key} title={key.replace(/([A-Z])/g, " $1")} value={value} />
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Founder controls</CardTitle>
            <CardDescription>Audited controls remain server enforced.</CardDescription>
          </CardHeader>
          <div className="grid gap-2">
            <Control href="/app/sales" label="View all leads" />
            <Control href="/app/callbacks" label="View all callbacks" />
            <Control href="/app/calendar" label="View team calendar" />
            <Control href="/app/settings/audit" label="Review audit history" />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Breakdown title="Calls by hour" data={callsByHour} />
        <Breakdown title="Calls by trade" data={callsByTrade} />
        <Breakdown title="Calls by caller" data={callsByCaller} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stale locks and score review</CardTitle>
          <CardDescription>
            Release stale locks and document manual Owner Reach Score reviews.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="grid gap-3">
            {data.locks.length ? (
              data.locks.map((lock) => (
                <form
                  action={releaseLeadLockAction}
                  className="rounded-md border border-border bg-background/35 p-3"
                  key={lock.id}
                >
                  <input name="lockId" type="hidden" value={lock.id} />
                  <p className="font-semibold">{lock.leadBusiness.businessName}</p>
                  <p className="text-sm text-muted">
                    Locked by {lock.lockedBy.name ?? lock.lockedBy.email} until{" "}
                    {formatDate(lock.expiresAt)}
                  </p>
                  <input className="ascend-input mt-3" name="reason" placeholder="Release reason" />
                  <Button className="mt-3" size="sm" type="submit" variant="secondary">
                    <LockOpen aria-hidden className="h-4 w-4" />
                    Release lock
                  </Button>
                </form>
              ))
            ) : (
              <p className="text-sm text-muted">No active locks.</p>
            )}
          </div>
          <form
            action={reviewOwnerReachScoreAction}
            className="grid gap-3 rounded-md border border-border bg-background/35 p-3"
          >
            <div className="flex items-center gap-2 font-semibold">
              <SlidersHorizontal aria-hidden className="h-4 w-4 text-primary" />
              Review score
            </div>
            <input className="ascend-input" name="leadBusinessId" placeholder="Lead ID" required />
            <input
              className="ascend-input"
              max={100}
              min={0}
              name="ownerReachScore"
              placeholder="Score"
              required
              type="number"
            />
            <textarea
              className="ascend-input min-h-24 py-3"
              name="ownerReachScoreReasons"
              placeholder="One reason per line"
              required
            />
            <input className="ascend-input" name="reason" placeholder="Review reason" required />
            <Button type="submit">
              <Target aria-hidden className="h-4 w-4" />
              Save review
            </Button>
          </form>
        </div>
      </Card>
    </section>
  );
}

function Metric({
  title,
  value,
  compact = false
}: {
  title: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase text-muted">{title}</p>
      <p className={compact ? "mt-1 text-xl font-semibold" : "mt-2 text-3xl font-semibold"}>
        {value}
      </p>
    </div>
  );
}

function Breakdown({ title, data }: { title: string; data: Array<[string, number]> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <BarChart3 aria-hidden className="mr-2 inline h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <div className="grid gap-2">
        {data.length ? (
          data.map(([label, value]) => (
            <p
              className="flex justify-between rounded-md border border-border bg-background/35 p-2 text-sm"
              key={label}
            >
              <span>{label}</span>
              <span className="font-semibold">{value}</span>
            </p>
          ))
        ) : (
          <p className="text-sm text-muted">No calls in this range.</p>
        )}
      </div>
    </Card>
  );
}

function Control({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="rounded-md border border-border bg-background/35 p-3 text-sm font-semibold hover:border-primary"
      href={href}
    >
      {label}
    </Link>
  );
}

function bucket<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dateRange(preset: string, from?: string, to?: string) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (from && to) {
    return { from: new Date(`${from}T00:00:00`), to: new Date(`${to}T23:59:59`) };
  }
  if (preset === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  }
  if (preset === "this-week") start.setDate(start.getDate() - start.getDay());
  if (preset === "last-week") {
    start.setDate(start.getDate() - start.getDay() - 7);
    end.setDate(start.getDate() + 6);
  }
  if (preset === "this-month") start.setDate(1);
  return { from: start, to: end };
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    value
  );
}
