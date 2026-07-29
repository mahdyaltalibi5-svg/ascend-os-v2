import { notFound, redirect } from "next/navigation";
import { ArrowUpRight, Layers3 } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  if (module === "sales") redirect("/app/sales");
  if (module === "revenue") redirect("/app/revenue");

  const href = moduleBySlug[module];
  if (!href) notFound();

  const context = await requireOrganizationContext(session.user.id);
  const navItem = appNavigation.find((item) => item.href === href);
  if (!navItem || !canSeeNavItem(context.permissions, navItem)) redirect("/app");

  return (
    <section className="reveal-up grid gap-6">
      <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">Foundation module</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal text-foreground md:text-5xl">
            {navItem.label}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">{navItem.description}</p>
        </div>
        <div className="w-fit rounded-md border border-border bg-surface/75 px-3 py-2 text-xs font-semibold uppercase text-muted shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)]">
          Access verified
        </div>
      </header>
      <Card className="scan-line">
        <CardHeader>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-primary/35 bg-primary/15 text-primary">
            <Layers3 aria-hidden className="h-5 w-5" />
          </div>
          <CardTitle>{navItem.label} extension point</CardTitle>
          <CardDescription>
            This surface is permission-gated and organization-aware. Functional workflows will be
            added in a later milestone after real data sources and integrations exist.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-3">
          {["Server authorization", "Tenant boundary", "Future workflow"].map((item) => (
            <div
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/35 px-3 py-2 text-sm text-muted"
              key={item}
            >
              {item}
              <ArrowUpRight aria-hidden className="h-4 w-4 text-primary" />
            </div>
          ))}
        </div>
      </Card>
      <EmptyState
        title={`${navItem.label} is intentionally empty`}
        description="This milestone creates the secure shell, permissions, and extension point. Functional workflows will be added in a later milestone."
      />
    </section>
  );
}
