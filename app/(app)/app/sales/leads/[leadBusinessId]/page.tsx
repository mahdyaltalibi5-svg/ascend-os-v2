import { AlertTriangle, ArrowLeft, PhoneCall } from "lucide-react";
import { redirect } from "next/navigation";

import { createSuppressionAction } from "@/app/(app)/app/sales/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { salesLabelByValue } from "@/lib/sales/constants";
import { formatMoney, labelize } from "@/lib/revenue/formatting";
import { getCurrentSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { requireOrganizationContext } from "@/lib/server/organization";

export default async function LeadDetailPage({
  params
}: {
  params: Promise<{ leadBusinessId: string }>;
}) {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");
  const context = await requireOrganizationContext(session.user.id);
  if (!context.permissions.includes("leads.view")) redirect("/app/sales");
  const { leadBusinessId } = await params;
  const lead = await prisma.leadBusiness.findFirstOrThrow({
    where: { id: leadBusinessId, organizationId: context.organization.id },
    include: {
      contacts: { orderBy: { updatedAt: "desc" } },
      analyses: { orderBy: { createdAt: "desc" } },
      prospects: {
        include: {
          outreachAttempts: { orderBy: { startedAt: "desc" } },
          followUps: { orderBy: { dueAt: "asc" } },
          appointments: { orderBy: { startAt: "asc" } },
          opportunities: { include: { pipelineStage: true }, orderBy: { updatedAt: "desc" } }
        }
      },
      suppressions: { orderBy: { createdAt: "desc" } }
    }
  });

  const prospect = lead.prospects[0];
  const attempts = lead.prospects.flatMap((item) => item.outreachAttempts);
  const followUps = lead.prospects.flatMap((item) => item.followUps);
  const opportunities = lead.prospects.flatMap((item) => item.opportunities);

  return (
    <section className="reveal-up grid gap-6">
      <a
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
        href="/app/sales"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Back to CRM
      </a>
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-primary">Lead detail</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal">{lead.businessName}</h1>
          <p className="mt-2 text-sm text-muted">
            {[lead.trade, lead.ownerName, lead.city, lead.state].filter(Boolean).join(" • ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lead.primaryPhone && lead.callReady && !lead.doNotCall ? (
            <a
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-background"
              href={`tel:${lead.primaryPhone}`}
            >
              <PhoneCall aria-hidden className="h-4 w-4" />
              Call
            </a>
          ) : null}
          {lead.doNotCall || lead.suppressions.length ? (
            <span className="inline-flex h-11 items-center gap-2 rounded-md border border-danger/50 bg-danger/10 px-4 text-sm font-semibold text-danger">
              <AlertTriangle aria-hidden className="h-4 w-4" />
              Do not call
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Qualification</CardTitle>
            <CardDescription>
              Call-ready status is derived from phone evidence, not manual optimism.
            </CardDescription>
          </CardHeader>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Fact label="Lead score" value={`${lead.leadScore}/100`} />
            <Fact label="Call ready" value={lead.callReady ? "Yes" : "No"} />
            <Fact label="Phone type" value={label(lead.phoneType)} />
            <Fact label="Phone evidence" value={label(lead.phoneVerificationMethod)} />
            <Fact label="Phone source" value={lead.phoneVerificationSource ?? "None"} />
            <Fact label="Owner source" value={lead.ownerVerificationSource ?? "None"} />
          </div>
          <div className="mt-4 grid gap-2 text-sm text-muted">
            {lead.websiteUrl ? <a href={lead.websiteUrl}>{lead.websiteUrl}</a> : null}
            {lead.googleBusinessProfileUrl ? (
              <a href={lead.googleBusinessProfileUrl}>{lead.googleBusinessProfileUrl}</a>
            ) : null}
            {lead.sourceUrls.map((url) => (
              <a href={url} key={url}>
                {url}
              </a>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suppression</CardTitle>
            <CardDescription>
              Suppressed numbers are permanently excluded from calling.
            </CardDescription>
          </CardHeader>
          <form action={createSuppressionAction} className="grid gap-3">
            <input name="leadBusinessId" type="hidden" value={lead.id} />
            <input name="prospectId" type="hidden" value={prospect?.id ?? ""} />
            <input name="phone" type="hidden" value={lead.primaryPhone ?? ""} />
            <input name="channel" type="hidden" value="phone" />
            <select className="ascend-input" name="reason" defaultValue="do_not_call">
              <option value="do_not_call">Do not call</option>
              <option value="wrong_person">Wrong number</option>
              <option value="duplicate">Duplicate</option>
              <option value="bad_fit">Disqualified</option>
            </select>
            <input name="source" type="hidden" value="lead_detail" />
            <Button type="submit" variant="danger">
              Suppress number
            </Button>
          </form>
          <div className="mt-4 grid gap-2">
            {lead.suppressions.map((suppression) => (
              <Fact
                key={suppression.id}
                label={label(suppression.reason)}
                value={`${label(suppression.channel)} • ${suppression.createdAt.toLocaleDateString()}`}
              />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Call history</CardTitle>
          </CardHeader>
          <Timeline
            empty="No calls recorded yet."
            items={attempts.map((attempt) => ({
              id: attempt.id,
              title: label(attempt.outcome),
              detail: `${label(attempt.channel)} • ${attempt.startedAt.toLocaleString()}`
            }))}
          />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Follow-ups</CardTitle>
          </CardHeader>
          <Timeline
            empty="No follow-ups yet."
            items={followUps.map((followUp) => ({
              id: followUp.id,
              title: label(followUp.type),
              detail: `${label(followUp.status)} • ${followUp.dueAt.toLocaleString()}`
            }))}
          />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
          </CardHeader>
          <Timeline
            empty="No opportunities yet."
            items={opportunities.map((opportunity) => ({
              id: opportunity.id,
              title: opportunity.pipelineStage.name,
              detail: `${formatMoney(opportunity.estimatedValueCents)} • ${label(opportunity.status)}`
            }))}
          />
        </Card>
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/35 p-3">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Timeline({
  empty,
  items
}: {
  empty: string;
  items: Array<{ id: string; title: string; detail: string }>;
}) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div className="rounded-md border border-border bg-background/35 p-3" key={item.id}>
          <p className="text-sm font-semibold">{item.title}</p>
          <p className="text-xs text-muted">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

function label(value: string) {
  return salesLabelByValue[value] ?? labelize(value);
}
