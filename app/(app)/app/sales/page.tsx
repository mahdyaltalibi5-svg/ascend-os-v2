import { redirect } from "next/navigation";

import { SalesCommandCenter } from "@/components/app/sales-command-center";
import { getCurrentSession } from "@/lib/server/auth";
import { requireOrganizationContext } from "@/lib/server/organization";
import { getSalesCommandData } from "@/lib/server/sales";

export default async function SalesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");
  const context = await requireOrganizationContext(session.user.id);
  if (
    !context.permissions.some((permission) =>
      [
        "leads.view",
        "prospects.view_own",
        "prospects.view_all",
        "pipeline.view_own",
        "pipeline.view_all"
      ].includes(permission)
    )
  ) {
    redirect("/app");
  }

  const params = (await searchParams) ?? {};
  const filterValue = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const data = await getSalesCommandData({
    organizationId: context.organization.id,
    userId: session.user.id,
    permissions: context.permissions,
    timezone: context.organization.timezone,
    filters: {
      search: filterValue("q"),
      trade: filterValue("trade"),
      status: filterValue("status"),
      sort: filterValue("sort")
    }
  });

  return <SalesCommandCenter data={data} permissions={context.permissions} />;
}
