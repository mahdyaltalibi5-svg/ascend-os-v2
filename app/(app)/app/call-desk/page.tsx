import { redirect } from "next/navigation";

import { CallDeskClient } from "@/components/app/call-desk-client";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/lib/server/auth";
import { getCallDeskContext, getCallDeskData } from "@/lib/server/call-desk";

export default async function CallDeskPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");

  const context = await getCallDeskContext(session.user.id);
  if (!context.permissions.includes("calls.create")) redirect("/app");

  const data = await getCallDeskData(context);

  return (
    <section className="grid gap-5">
      <Card className="scan-line">
        <CardHeader>
          <CardTitle>Owner-first call desk</CardTitle>
          <CardDescription>
            One assigned, verified lead at a time. Calls open through a normal phone link, then
            outcomes are recorded here when the caller returns.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3 text-sm text-muted sm:grid-cols-3">
          <p>{data.queue.length} eligible leads previewed</p>
          <p>
            {data.callbacks.filter((callback) => callback.effectiveStatus === "overdue").length}{" "}
            overdue callbacks
          </p>
          <p>{data.appointments.length} appointments visible</p>
        </div>
      </Card>
      <CallDeskClient initialData={data} />
    </section>
  );
}
