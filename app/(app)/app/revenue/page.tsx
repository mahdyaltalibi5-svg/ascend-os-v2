import { redirect } from "next/navigation";

import { RevenueCommandCenter } from "@/components/app/revenue-command-center";
import { getCurrentSession } from "@/lib/server/auth";
import { requireOrganizationContext } from "@/lib/server/organization";
import { getRevenueCommandData } from "@/lib/server/revenue";

export default async function RevenuePage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");

  const context = await requireOrganizationContext(session.user.id);
  if (!context.permissions.includes("revenue.view")) redirect("/app");

  const data = await getRevenueCommandData({
    organizationId: context.organization.id,
    userId: session.user.id,
    timezone: context.organization.timezone
  });

  return <RevenueCommandCenter data={data} permissions={context.permissions} />;
}
