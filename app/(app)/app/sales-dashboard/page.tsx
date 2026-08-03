import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck2, CheckCircle2, Clock3, PhoneCall, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PwaPreferences } from "@/components/app/pwa-preferences";
import { getCurrentSession } from "@/lib/server/auth";
import { getCallDeskContext, getSalesDashboardData } from "@/lib/server/call-desk";

export default async function SalesDashboardPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");
  const context = await getCallDeskContext(session.user.id);
  if (!context.permissions.includes("analytics.personal")) redirect("/app");

  const data = await getSalesDashboardData(context);
  const metrics = data.metrics;
  const now = new Date();
  const appointmentsToday = data.appointments.filter(
    (appointment) => appointment.startAt.toDateString() === now.toDateString()
  );
  const overdueCallbacks = data.callbacks.filter(
    (callback) => callback.effectiveStatus === "overdue"
  );
  const followUpsDue = data.callbacks.filter((callback) =>
    ["due", "overdue"].includes(callback.effectiveStatus)
  );
  const bestTrade = topBucket(data.weeklyCalls, (call) => call.leadBusiness.trade ?? "Unknown");
  const bestHour = topBucket(data.weeklyCalls, (call) => `${call.startedAt.getHours()}:00`);
  const weeklyTrend = lastSevenDays(data.weeklyCalls);

  return (
    <section className="grid gap-5">
      <Card className="scan-line">
        <CardHeader>
          <CardTitle>Sales dashboard</CardTitle>
          <CardDescription>
            Your assigned leads, callbacks, appointments, and personal activity. Company financials
            and founder controls stay out of this workspace.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/call-desk">
            <Button type="button">
              <PhoneCall aria-hidden className="h-4 w-4" />
              Start Calling
            </Button>
          </Link>
          <Link href="/app/callbacks">
            <Button type="button" variant="secondary">
              <Clock3 aria-hidden className="h-4 w-4" />
              Due Callbacks
            </Button>
          </Link>
          <Link href="/app/calendar?view=day">
            <Button type="button" variant="secondary">
              <CalendarCheck2 aria-hidden className="h-4 w-4" />
              Today
            </Button>
          </Link>
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Calls today" value={`${metrics.dialsToday} / ${data.dailyCallTarget}`} />
        <Metric title="Owner conversations" value={metrics.ownersReached} />
        <Metric
          title="Meeting bookings"
          value={`${metrics.meetingsBooked} / ${data.bookingTarget}`}
        />
        <Metric title="Booking rate" value={`${metrics.dialToBookingRate}%`} />
        <Metric title="Follow-ups due" value={followUpsDue.length} />
        <Metric
          title="Overdue callbacks"
          value={overdueCallbacks.length}
          danger={overdueCallbacks.length > 0}
        />
        <Metric title="Appointments today" value={appointmentsToday.length} />
        <Metric title="Leads remaining" value={data.queue.length} />
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              <TrendingUp aria-hidden className="mr-2 inline h-4 w-4 text-primary" />
              Personal trend
            </CardTitle>
            <CardDescription>Calls over the last seven days.</CardDescription>
          </CardHeader>
          <div className="grid gap-2">
            {weeklyTrend.map(([day, count]) => (
              <p
                className="flex justify-between rounded-md border border-border bg-background/35 p-2 text-sm"
                key={day}
              >
                <span>{day}</span>
                <span className="font-semibold">{count}</span>
              </p>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Best windows</CardTitle>
            <CardDescription>Simple statistics from your own recent calls.</CardDescription>
          </CardHeader>
          <div className="grid gap-3">
            <Metric compact title="Best-performing window" value={bestHour ?? "Need more calls"} />
            <Metric compact title="Best-performing trade" value={bestTrade ?? "Need more calls"} />
            <Metric compact title="Calling streak" value={`${streak(data.weeklyCalls)} days`} />
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Next actions</CardTitle>
            <CardDescription>High-frequency work shortcuts.</CardDescription>
          </CardHeader>
          <div className="grid gap-2">
            <Action href="/app/call-desk" label="Resume Pending Call" />
            <Action href="/app/callbacks" label="Open Due Callbacks" />
            <Action href="/app/calendar?view=day" label="View Today's Appointments" />
            <Action href="/app/sales" label="Add Notes" />
            <Action href="/app/call-desk" label="Schedule Follow-Up" />
            <Action href="/app/call-desk" label="Book Appointment" />
          </div>
        </Card>
      </div>

      <PwaPreferences />

      <Card>
        <CardHeader>
          <CardTitle>Upcoming appointments</CardTitle>
          <CardDescription>Your visible appointments ordered by start time.</CardDescription>
        </CardHeader>
        <div className="grid gap-2">
          {data.appointments.slice(0, 8).map((appointment) => (
            <Link
              className="rounded-md border border-border bg-background/35 p-3 text-sm hover:border-primary"
              href={`/app/sales/leads/${appointment.prospect.leadBusinessId}`}
              key={appointment.id}
            >
              <CheckCircle2 aria-hidden className="mr-2 inline h-4 w-4 text-primary" />
              {appointment.prospect.leadBusiness.businessName} · {formatDate(appointment.startAt)}
            </Link>
          ))}
          {data.appointments.length === 0 ? (
            <p className="text-sm text-muted">No appointments visible yet.</p>
          ) : null}
        </div>
      </Card>
    </section>
  );
}

function Metric({
  title,
  value,
  compact = false,
  danger = false
}: {
  title: string;
  value: string | number;
  compact?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-md border bg-surface p-4 ${danger ? "border-danger/60" : "border-border"}`}
    >
      <p className="text-xs font-semibold uppercase text-muted">{title}</p>
      <p className={compact ? "mt-1 text-lg font-semibold" : "mt-2 text-3xl font-semibold"}>
        {value}
      </p>
    </div>
  );
}

function Action({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="rounded-md border border-border bg-background/35 p-3 text-sm font-semibold hover:border-primary"
      href={href}
    >
      {label}
    </Link>
  );
}

function topBucket<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(getKey(item), (counts.get(getKey(item)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function lastSevenDays(calls: Array<{ startedAt: Date }>) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const label = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day);
    const count = calls.filter(
      (call) => call.startedAt.toDateString() === day.toDateString()
    ).length;
    return [label, count] as const;
  });
}

function streak(calls: Array<{ startedAt: Date }>) {
  let count = 0;
  for (let daysBack = 0; daysBack < 7; daysBack += 1) {
    const day = new Date();
    day.setDate(day.getDate() - daysBack);
    if (!calls.some((call) => call.startedAt.toDateString() === day.toDateString())) break;
    count += 1;
  }
  return count;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    value
  );
}
