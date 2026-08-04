import { redirect } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  PhoneCall,
  SearchCheck,
  ShieldCheck,
  Target,
  UsersRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getCurrentSession } from "@/lib/server/auth";
import { requireOrganizationContext } from "@/lib/server/organization";

type HubAction = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  permissions: string[];
  tone?: "primary" | "warm" | "mint";
};

const hubActions: HubAction[] = [
  {
    title: "Speed Dialer",
    description: "Start the next verified call.",
    href: "/app/call-desk",
    icon: PhoneCall,
    permissions: ["calls.create", "calls.operate_assigned"],
    tone: "primary"
  },
  {
    title: "Lead Queue",
    description: "Call-ready Utah HVAC and plumbing leads.",
    href: "/app/sales/queue",
    icon: ClipboardList,
    permissions: ["prospects.view_own", "prospects.view_all"]
  },
  {
    title: "Scraper Review",
    description: "Approve discovered companies before calling.",
    href: "/app/scraper",
    icon: SearchCheck,
    permissions: ["scraper.view"],
    tone: "mint"
  },
  {
    title: "Follow-ups",
    description: "Handle overdue and scheduled callbacks.",
    href: "/app/sales/follow-ups",
    icon: CalendarClock,
    permissions: ["followups.view_own", "followups.view_all"]
  },
  {
    title: "Pipeline",
    description: "Move deals through each sales stage.",
    href: "/app/sales/pipeline",
    icon: Target,
    permissions: ["pipeline.view_own", "pipeline.view_all"]
  },
  {
    title: "Founder",
    description: "Company controls and sales oversight.",
    href: "/app/founder",
    icon: ShieldCheck,
    permissions: ["analytics.company"],
    tone: "warm"
  }
];

export default async function AppDashboardPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");

  const context = await requireOrganizationContext(session.user.id);
  const roleLabel = context.roleKeys.includes("founder") ? "CEO" : "Sales";
  const visibleActions = hubActions.filter((action) =>
    action.permissions.some((permission) => context.permissions.includes(permission))
  );
  const firstName = (session.user.name ?? session.user.email ?? "there").split(" ")[0];

  return (
    <section className="reveal-up grid gap-5">
      <header className="grid gap-4 rounded-md border border-border bg-surface/72 p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)] sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-sm border border-primary/45 bg-primary/10 px-2 py-1 text-xs font-bold uppercase text-primary">
              {roleLabel}
            </span>
            <span className="text-xs font-semibold uppercase text-muted-soft">
              {context.organization.name}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            Ready, {firstName}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Pick one thing and move. The full dashboards are still here, but this page is built for
            getting to calls fast.
          </p>
        </div>
        <a
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-background transition hover:bg-primary-soft"
          href="/app/call-desk"
        >
          <PhoneCall aria-hidden className="h-4 w-4" />
          Start dialing
        </a>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleActions.map((action) => (
          <ActionCard key={action.href} action={action} />
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MiniLink
          description="Manual import, campaign tools, lead table."
          href="/app/sales"
          icon={UsersRound}
          title="Sales workspace"
        />
        <MiniLink
          description="Personal metrics and next actions."
          href="/app/sales-dashboard"
          icon={BarChart3}
          title="My dashboard"
        />
        <MiniLink
          description="Appointments, callbacks, and follow-ups."
          href="/app/calendar"
          icon={CalendarClock}
          title="Calendar"
        />
      </div>
    </section>
  );
}

function ActionCard({ action }: { action: HubAction }) {
  const Icon = action.icon;
  const toneClass =
    action.tone === "warm"
      ? "border-accent-warm/45 bg-accent-warm/10 text-accent-warm"
      : action.tone === "mint"
        ? "border-accent-mint/45 bg-accent-mint/10 text-accent-mint"
        : "border-primary/45 bg-primary/10 text-primary";

  return (
    <a href={action.href} className="group block">
      <Card className="min-h-36 p-4 transition duration-150 group-hover:border-border-strong group-hover:bg-surface-raised">
        <div className="flex h-full items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-foreground">{action.title}</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{action.description}</p>
          </div>
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${toneClass}`}
          >
            <Icon aria-hidden className="h-5 w-5" />
          </span>
        </div>
      </Card>
    </a>
  );
}

function MiniLink({
  title,
  description,
  href,
  icon: Icon
}: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <a
      className="rounded-md border border-border bg-background/30 p-4 transition hover:border-border-strong hover:bg-surface-raised"
      href={href}
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-primary">
        <Icon aria-hidden className="h-4 w-4" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
    </a>
  );
}
