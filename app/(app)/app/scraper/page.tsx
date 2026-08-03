import { redirect } from "next/navigation";

import { ScraperCommandCenter } from "@/components/app/scraper-command-center";
import { getCurrentSession } from "@/lib/server/auth";
import { getScraperContext, getScraperDashboardData } from "@/lib/server/scraper";

export default async function ScraperPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");

  const context = await getScraperContext();
  const data = await getScraperDashboardData(context);

  return <ScraperCommandCenter data={data} permissions={context.permissions} />;
}
