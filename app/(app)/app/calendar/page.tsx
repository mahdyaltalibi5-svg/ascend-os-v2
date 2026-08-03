import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock3, PhoneCall } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/lib/server/auth";
import { getCalendarData, getCallDeskContext } from "@/lib/server/call-desk";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CalendarPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");

  const context = await getCallDeskContext(session.user.id);
  if (
    !context.permissions.includes("appointments.view_all") &&
    !context.permissions.includes("appointments.view_own") &&
    !context.permissions.includes("callbacks.view_all") &&
    !context.permissions.includes("callbacks.view_own")
  ) {
    redirect("/app");
  }

  const params = (await searchParams) ?? {};
  const viewParam = params.view;
  const view = Array.isArray(viewParam) ? viewParam[0] : viewParam || "agenda";
  const data = await getCalendarData(context);
  const events = [
    ...data.appointments.map((appointment) => ({
      id: appointment.id,
      type: "appointment",
      title: appointment.title,
      startsAt: appointment.startAt,
      href: `/app/sales/leads/${appointment.prospect.leadBusinessId}`,
      meta: `${appointment.status} · ${appointment.meetingType}`,
      businessName: appointment.prospect.leadBusiness.businessName
    })),
    ...data.callbacks.map((callback) => ({
      id: callback.id,
      type: "callback",
      title: callback.reason,
      startsAt: callback.scheduledAt,
      href: `/app/sales/leads/${callback.leadBusinessId}`,
      meta: callback.effectiveStatus,
      businessName: callback.leadBusiness.businessName
    })),
    ...data.followUps.map((followUp) => ({
      id: followUp.id,
      type: "follow-up",
      title: followUp.type,
      startsAt: followUp.dueAt,
      href: `/app/sales/leads/${followUp.prospect.leadBusinessId}`,
      meta: followUp.status,
      businessName: followUp.prospect.leadBusiness.businessName
    }))
  ]
    .filter((event) => eventMatchesView(event.startsAt, view))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return (
    <section className="grid gap-5">
      <Card className="scan-line">
        <CardHeader>
          <CardTitle>Internal calendar</CardTitle>
          <CardDescription>
            Appointments, exact callbacks, and follow-up tasks stay inside Ascend Sales OS until
            external calendar sync is added later.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          {["day", "week", "agenda"].map((option) => (
            <Link
              className={`rounded-md border px-3 py-2 text-sm ${
                view === option
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted"
              }`}
              href={`/app/calendar?view=${option}`}
              key={option}
            >
              {option}
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <div className="grid gap-3">
          {events.length ? (
            events.map((event) => (
              <Link
                className="grid gap-2 rounded-md border border-border bg-background/35 p-3 transition hover:border-primary md:grid-cols-[auto_1fr_auto] md:items-center"
                href={event.href}
                key={`${event.type}-${event.id}`}
              >
                {event.type === "appointment" ? (
                  <CalendarDays aria-hidden className="h-5 w-5 text-primary" />
                ) : event.type === "callback" ? (
                  <PhoneCall aria-hidden className="h-5 w-5 text-primary" />
                ) : (
                  <Clock3 aria-hidden className="h-5 w-5 text-primary" />
                )}
                <span>
                  <span className="block font-semibold text-foreground">{event.businessName}</span>
                  <span className="block text-sm text-muted">
                    {event.title} · {event.meta}
                  </span>
                </span>
                <span className="text-sm text-muted">{formatDate(event.startsAt)}</span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted">No calendar events for this view.</p>
          )}
        </div>
      </Card>
    </section>
  );
}

function eventMatchesView(value: Date, view: string) {
  if (view === "agenda") return true;
  const now = new Date();
  if (view === "day") return value.toDateString() === now.toDateString();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  return value >= now && value <= weekEnd;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}
