import { redirect } from "next/navigation";

import { SalesCommandCenter } from "@/components/app/sales-command-center";
import { getCurrentSession } from "@/lib/server/auth";
import { requireOrganizationContext } from "@/lib/server/organization";
import { getSalesCommandData } from "@/lib/server/sales";

export async function SalesViewPage({
  view
}: {
  view: "queue" | "follow-ups" | "appointments" | "pipeline" | "performance";
}) {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");
  const context = await requireOrganizationContext(session.user.id);
  const allowed = {
    queue: ["prospects.view_own", "prospects.view_all"],
    "follow-ups": ["followups.view_own", "followups.view_all"],
    appointments: ["appointments.view_own", "appointments.view_all"],
    pipeline: ["pipeline.view_own", "pipeline.view_all"],
    performance: ["sales.goals.view_own", "sales.goals.view_all", "sales.reports.view"]
  }[view];
  if (!context.permissions.some((permission) => allowed.includes(permission)))
    redirect("/app/sales");

  const data = await getSalesCommandData({
    organizationId: context.organization.id,
    userId: session.user.id,
    permissions: context.permissions,
    timezone: context.organization.timezone
  });

  return <SalesCommandCenter data={data} permissions={context.permissions} view={view} />;
}
