import { redirect } from "next/navigation";

import { CallDeskClient } from "@/components/app/call-desk-client";
import { getCurrentSession } from "@/lib/server/auth";
import { getCallDeskContext, getCallDeskData } from "@/lib/server/call-desk";

export default async function CallDeskPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");

  const context = await getCallDeskContext(session.user.id);
  if (!context.permissions.includes("calls.create")) redirect("/app");

  const data = await getCallDeskData(context);

  return (
    <section className="grid gap-4">
      <header className="rounded-md border border-border bg-surface/72 p-4">
        <p className="text-sm font-semibold text-primary">Speed Dialer</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal text-foreground">
          Owner-first call desk
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          One lead at a time, with evidence visible and outcomes always one tap away.
        </p>
      </header>
      <CallDeskClient initialData={data} />
    </section>
  );
}
