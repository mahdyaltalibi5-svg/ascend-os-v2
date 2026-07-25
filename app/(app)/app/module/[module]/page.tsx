import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { appNavigation, canSeeNavItem } from "@/lib/navigation";
import { getCurrentSession } from "@/lib/server/auth";
import { requireOrganizationContext } from "@/lib/server/organization";

const moduleBySlug: Record<string, string> = {
  sales: "/app/module/sales",
  revenue: "/app/module/revenue",
  clients: "/app/module/clients",
  growth: "/app/module/growth",
  "personal-brand": "/app/module/personal-brand",
  agents: "/app/module/agents"
};

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");

  const { module } = await params;
  const href = moduleBySlug[module];
  if (!href) notFound();

  const context = await requireOrganizationContext(session.user.id);
  const navItem = appNavigation.find((item) => item.href === href);
  if (!navItem || !canSeeNavItem(context.permissions, navItem)) redirect("/app");

  return (
    <section className="grid gap-6">
      <header className="max-w-3xl">
        <p className="text-sm font-medium text-primary">Foundation module</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">{navItem.label}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{navItem.description}</p>
      </header>
      <EmptyState
        title={`${navItem.label} is intentionally empty`}
        description="This milestone creates the secure shell, permissions, and extension point. Functional workflows will be added in a later milestone."
      />
    </section>
  );
}
