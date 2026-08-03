import Link from "next/link";
import { redirect } from "next/navigation";
import { AlarmClock, CheckCircle2, Clock3, Filter, PhoneCall, XCircle } from "lucide-react";

import { updateCallbackAction } from "@/app/(app)/app/callbacks/actions";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/server/auth";
import { getCallDeskContext, getCallbacks } from "@/lib/server/call-desk";
import { salesLabelByValue } from "@/lib/sales/constants";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CallbacksPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");

  const context = await getCallDeskContext(session.user.id);
  if (
    !context.permissions.includes("callbacks.view_all") &&
    !context.permissions.includes("callbacks.view_own")
  ) {
    redirect("/app");
  }

  const params = (await searchParams) ?? {};
  const value = (key: string) => {
    const param = params[key];
    return Array.isArray(param) ? param[0] : param;
  };
  const caller = value("caller") ?? "";
  const trade = value("trade") ?? "";
  const city = value("city") ?? "";
  const status = value("status") ?? "";
  const callbacks = (await getCallbacks(context)).filter((callback) => {
    if (context.canViewAll && caller && callback.assignedCallerId !== caller) return false;
    if (trade && callback.leadBusiness.trade !== trade) return false;
    if (city && callback.leadBusiness.city !== city) return false;
    if (status && callback.effectiveStatus !== status) return false;
    return true;
  });

  const grouped = {
    overdue: callbacks.filter((callback) => callback.effectiveStatus === "overdue"),
    due: callbacks.filter((callback) => callback.effectiveStatus === "due"),
    laterToday: callbacks.filter(
      (callback) => callback.effectiveStatus === "scheduled" && isToday(callback.scheduledAt)
    ),
    tomorrow: callbacks.filter((callback) => isTomorrow(callback.scheduledAt)),
    upcoming: callbacks.filter(
      (callback) =>
        callback.effectiveStatus === "scheduled" &&
        !isToday(callback.scheduledAt) &&
        !isTomorrow(callback.scheduledAt)
    ),
    completed: callbacks.filter((callback) => callback.effectiveStatus === "completed")
  };

  return (
    <section className="grid gap-5">
      <Card className="scan-line">
        <CardHeader>
          <CardTitle>Callback engine</CardTitle>
          <CardDescription>
            Exact callbacks stay assigned to the right caller and jump to the top of the call queue
            when due.
          </CardDescription>
        </CardHeader>
        <form className="grid gap-3 sm:grid-cols-4" method="get">
          <Filter aria-hidden className="hidden h-5 w-5 self-end text-primary sm:block" />
          <input className="ascend-input" name="trade" placeholder="Trade" defaultValue={trade} />
          <input className="ascend-input" name="city" placeholder="City" defaultValue={city} />
          <select className="ascend-input" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {["due", "overdue", "scheduled", "completed", "canceled", "missed"].map((option) => (
              <option key={option} value={option}>
                {salesLabelByValue[option] ?? option}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </Card>

      <CallbackSection title="Overdue" callbacks={grouped.overdue} urgent />
      <CallbackSection title="Due now" callbacks={grouped.due} />
      <CallbackSection title="Later today" callbacks={grouped.laterToday} />
      <CallbackSection title="Tomorrow" callbacks={grouped.tomorrow} />
      <CallbackSection title="Upcoming" callbacks={grouped.upcoming} />
      <CallbackSection title="Completed" callbacks={grouped.completed} />
    </section>
  );
}

function CallbackSection({
  title,
  callbacks,
  urgent = false
}: {
  title: string;
  callbacks: Awaited<ReturnType<typeof getCallbacks>>;
  urgent?: boolean;
}) {
  return (
    <Card className={urgent ? "border-danger/60" : undefined}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{callbacks.length} callbacks</CardDescription>
      </CardHeader>
      <div className="grid gap-3">
        {callbacks.length ? (
          callbacks.map((callback) => (
            <div
              className="grid gap-3 rounded-md border border-border bg-background/35 p-3 md:grid-cols-[1fr_auto] md:items-center"
              key={callback.id}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {urgent ? (
                    <AlarmClock aria-hidden className="h-4 w-4 text-danger" />
                  ) : (
                    <Clock3 aria-hidden className="h-4 w-4 text-primary" />
                  )}
                  <Link
                    className="font-semibold text-foreground hover:text-primary"
                    href={`/app/sales/leads/${callback.leadBusinessId}`}
                  >
                    {callback.leadBusiness.businessName}
                  </Link>
                  <span className="text-xs text-muted">
                    {callback.assignedCaller.name ?? callback.assignedCaller.email}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {formatDate(callback.scheduledAt)} {callback.timezone} · {callback.reason}
                </p>
                {callback.notes ? (
                  <p className="mt-1 text-sm text-muted">{callback.notes}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {!["completed", "canceled"].includes(callback.effectiveStatus) ? (
                  <form action={updateCallbackAction} className="flex flex-wrap gap-2">
                    <input name="callbackId" type="hidden" value={callback.id} />
                    <input name="status" type="hidden" value="scheduled" />
                    <input
                      className="ascend-input h-9 min-w-48"
                      name="scheduledAt"
                      required
                      type="datetime-local"
                    />
                    <Button size="sm" type="submit" variant="secondary">
                      Snooze
                    </Button>
                  </form>
                ) : null}
                {callback.effectiveStatus !== "completed" ? (
                  <form action={updateCallbackAction}>
                    <input name="callbackId" type="hidden" value={callback.id} />
                    <input name="status" type="hidden" value="completed" />
                    <Button size="sm" type="submit" variant="secondary">
                      <CheckCircle2 aria-hidden className="h-4 w-4" />
                      Complete
                    </Button>
                  </form>
                ) : null}
                {!["completed", "canceled"].includes(callback.effectiveStatus) ? (
                  <form action={updateCallbackAction}>
                    <input name="callbackId" type="hidden" value={callback.id} />
                    <input name="status" type="hidden" value="canceled" />
                    <Button size="sm" type="submit" variant="ghost">
                      <XCircle aria-hidden className="h-4 w-4" />
                      Cancel
                    </Button>
                  </form>
                ) : null}
                <Link className="inline-flex" href="/app/call-desk">
                  <Button size="sm" type="button">
                    <PhoneCall aria-hidden className="h-4 w-4" />
                    Call
                  </Button>
                </Link>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">Nothing here right now.</p>
        )}
      </div>
    </Card>
  );
}

function isToday(value: Date) {
  const now = new Date();
  return value.toDateString() === now.toDateString();
}

function isTomorrow(value: Date) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return value.toDateString() === tomorrow.toDateString();
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}
