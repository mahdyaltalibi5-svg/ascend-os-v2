import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  FileUp,
  Flag,
  Gauge,
  PhoneCall,
  Plus,
  Radar,
  Target
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  analyzeLeadAction,
  completeFollowUpAction,
  convertLeadToProspectAction,
  createAppointmentAction,
  createFollowUpAction,
  createLeadCampaignAction,
  createManualLeadAction,
  createOpportunityAction,
  createRevenueHandoffAction,
  createSalesGoalAction,
  createSalesPriorityAction,
  importLeadsCsvAction,
  launchLeadCampaignAction,
  moveOpportunityStageAction,
  recordOutreachAttemptAction,
  updateLeadBusinessAction,
  updateProspectAction
} from "@/app/(app)/app/sales/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatMoney, labelize } from "@/lib/revenue/formatting";
import {
  appointmentStatuses,
  campaignStatuses,
  crmTrades,
  leadIndustryPresets,
  meetingTypes,
  outreachChannels,
  outreachOutcomes,
  phoneTypes,
  phoneVerificationMethods,
  prospectPriorities,
  salesGoalMetrics,
  salesLabelByValue
} from "@/lib/sales/constants";
import { telUrl } from "@/lib/sales/call-desk";
import type { SalesCommandData } from "@/lib/server/sales";
import { cn } from "@/lib/utils";

type SalesCommandCenterProps = {
  data: SalesCommandData;
  permissions: string[];
  view?: "overview" | "queue" | "follow-ups" | "appointments" | "pipeline" | "performance";
};

export function SalesCommandCenter({
  data,
  permissions,
  view = "overview"
}: SalesCommandCenterProps) {
  const canManageLeads = permissions.includes("leads.manage");
  const canManageCampaigns = permissions.includes("leads.campaigns.manage");
  const canResearch = permissions.includes("leads.research.manage");
  const canManageAllProspects = permissions.includes("prospects.manage_all");
  const canManageOwnProspects = permissions.includes("prospects.manage_own");
  const canManageAppointments =
    permissions.includes("appointments.manage_all") ||
    permissions.includes("appointments.manage_own");
  const canManagePipeline =
    permissions.includes("pipeline.manage") ||
    permissions.includes("opportunities.manage_all") ||
    permissions.includes("opportunities.manage_own");
  const canRevenueHandoff = permissions.includes("revenue.contracts.manage");
  const canManageGoals = permissions.includes("sales.goals.manage");
  const showFounderTools =
    canManageCampaigns ||
    permissions.includes("sales.reports.view") ||
    permissions.includes("pipeline.view_all");

  return (
    <section className="reveal-up grid gap-6">
      <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold text-primary">Sales Operating System</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal text-foreground md:text-5xl">
            Utah HVAC and plumbing CRM
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">
            Discover, qualify, call, track, and follow up with owner-verified local businesses.
            Call-ready leads require official phone evidence before they enter the queue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-4 text-sm font-semibold text-foreground transition hover:border-border-strong hover:bg-surface-elevated"
            href="/app/sales/export?type=prospects"
          >
            <Download aria-hidden className="h-4 w-4" />
            Export prospects
          </a>
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-4 text-sm font-semibold text-foreground transition hover:border-border-strong hover:bg-surface-elevated"
            href="/app/sales/queue"
          >
            <PhoneCall aria-hidden className="h-4 w-4" />
            Open queue
          </a>
        </div>
      </header>

      <nav className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Sales sections">
        {[
          ["Overview", "/app/sales", "overview"],
          ["Queue", "/app/sales/queue", "queue"],
          ["Follow-ups", "/app/sales/follow-ups", "follow-ups"],
          ["Appointments", "/app/sales/appointments", "appointments"],
          ["Pipeline", "/app/sales/pipeline", "pipeline"],
          ["Performance", "/app/sales/performance", "performance"]
        ].map(([label, href, key]) => (
          <a
            className={cn(
              "rounded-md border border-border bg-background/35 px-3 py-2 text-center text-sm font-semibold text-muted transition hover:border-border-strong hover:text-foreground",
              view === key && "border-primary/55 bg-primary/10 text-foreground"
            )}
            href={href}
            key={key}
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Score icon={PhoneCall} label="Dials today" value={String(data.metrics.dialsToday)} />
        <Score icon={Activity} label="Answers" value={String(data.metrics.answers)} />
        <Score icon={Target} label="Owners reached" value={String(data.metrics.ownersReached)} />
        <Score icon={Radar} label="Full pitches" value={String(data.metrics.fullPitches)} />
        <Score
          icon={CalendarClock}
          label="Meetings booked"
          value={String(data.metrics.meetingsBooked)}
        />
        <Score icon={Flag} label="Booking rate" value={`${data.metrics.bookingRate}%`} />
        <Score
          icon={CalendarClock}
          label="Follow-ups due"
          value={String(data.attention.overdueFollowUps)}
          tone="hot"
        />
        <Score icon={PhoneCall} label="Calls by Mahdy" value={String(data.metrics.callsByMahdy)} />
        <Score icon={PhoneCall} label="Calls by Logan" value={String(data.metrics.callsByLogan)} />
        <Score icon={Radar} label="Callable queue" value={String(data.queue.length)} />
      </div>

      <Card className="scan-line">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-primary">Recommended sales action</p>
            <h2 className="mt-2 text-2xl font-semibold">{data.recommendation}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Queue health, ownership gaps, follow-up risk, and stale opportunities are ranked
              deterministically from live records.
            </p>
          </div>
          <form action={createSalesPriorityAction}>
            <input name="title" type="hidden" value={data.recommendation} />
            <input
              name="description"
              type="hidden"
              value="Sales priority created from the Sales Operating System recommendation."
            />
            <input name="impactCents" type="hidden" value={data.metrics.openPipelineCents} />
            <Button type="submit" variant="secondary">
              <Plus aria-hidden className="h-4 w-4" />
              Add priority
            </Button>
          </form>
        </div>
      </Card>

      {view === "queue" ? (
        <QueueView data={data} permissions={permissions} />
      ) : view === "follow-ups" ? (
        <FollowUpsView data={data} />
      ) : view === "appointments" ? (
        <AppointmentsView data={data} canManage={canManageAppointments} />
      ) : view === "pipeline" ? (
        <PipelineView
          data={data}
          canManage={canManagePipeline}
          canRevenueHandoff={canRevenueHandoff}
        />
      ) : view === "performance" ? (
        <PerformanceView data={data} canManageGoals={canManageGoals} />
      ) : (
        <OverviewView
          data={data}
          canManageLeads={canManageLeads}
          canManageCampaigns={canManageCampaigns}
          canResearch={canResearch}
          canManageProspects={canManageAllProspects || canManageOwnProspects}
          showFounderTools={showFounderTools}
        />
      )}
    </section>
  );
}

function OverviewView({
  data,
  canManageLeads,
  canManageCampaigns,
  canResearch,
  canManageProspects,
  showFounderTools
}: {
  data: SalesCommandData;
  canManageLeads: boolean;
  canManageCampaigns: boolean;
  canResearch: boolean;
  canManageProspects: boolean;
  showFounderTools: boolean;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <div className="grid gap-6">
        {canManageCampaigns ? <CampaignPanel data={data} /> : null}
        {canManageLeads ? <ManualLeadPanel data={data} /> : null}
        {canManageLeads ? <CsvImportPanel /> : null}
        <LeadReviewPanel data={data} canResearch={canResearch} canConvert={canManageProspects} />
      </div>
      <div className="grid content-start gap-6">
        <AttentionPanel data={data} />
        {showFounderTools ? <CampaignList data={data} /> : null}
        <JobPanel data={data} />
      </div>
    </div>
  );
}

function CampaignPanel({ data }: { data: SalesCommandData }) {
  return (
    <Card className="scan-line">
      <CardHeader>
        <CardTitle>Create lead campaign</CardTitle>
        <CardDescription>
          Creates a real stored campaign. Launching requires a provider key.
        </CardDescription>
      </CardHeader>
      <form action={createLeadCampaignAction} className="grid gap-3">
        <Input
          name="name"
          label="Campaign name"
          placeholder="Phoenix HVAC owner-operated prospects"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select name="industry" label="Industry" defaultValue="hvac">
            {leadIndustryPresets.map((preset) => (
              <option key={preset.key} value={preset.key}>
                {preset.label}
              </option>
            ))}
          </Select>
          <Input name="city" label="City" placeholder="Phoenix" />
          <Input name="state" label="State" placeholder="AZ" />
        </div>
        <Input
          name="searchTerms"
          label="Search terms"
          defaultValue="hvac contractor, heating and cooling company"
        />
        <div className="grid gap-3 sm:grid-cols-4">
          <Input name="targetLeadCount" label="Target leads" defaultValue="100" />
          <Input name="maxReviewCount" label="Max reviews" defaultValue="150" />
          <Input name="minRating" label="Min rating" placeholder="3.4" />
          <Select name="status" label="Status" defaultValue="ready">
            {campaignStatuses.map((status) => (
              <option value={status} key={status}>
                {label(status)}
              </option>
            ))}
          </Select>
        </div>
        <input name="country" type="hidden" value="United States" />
        <input name="sourceProvider" type="hidden" value="google_places" />
        <Button type="submit">
          <Radar aria-hidden className="h-4 w-4" />
          Save campaign
        </Button>
      </form>
      {data.campaigns[0] ? (
        <form action={launchLeadCampaignAction} className="mt-4">
          <input name="campaignId" type="hidden" value={data.campaigns[0].id} />
          <Button type="submit" variant="secondary">
            Launch latest campaign
          </Button>
        </form>
      ) : null}
    </Card>
  );
}

function ManualLeadPanel({ data }: { data: SalesCommandData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create lead</CardTitle>
        <CardDescription>
          Phone evidence must be official before a lead can become call ready.
        </CardDescription>
      </CardHeader>
      <form action={createManualLeadAction} className="grid gap-3">
        <Input name="businessName" label="Business name" placeholder="Wasatch Comfort Pros" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select name="trade" label="Trade" defaultValue="HVAC">
            {crmTrades.map((trade) => (
              <option key={trade} value={trade}>
                {trade}
              </option>
            ))}
          </Select>
          <Input name="ownerName" label="Owner name" placeholder="Owner evidence required" />
          <Select name="assignedUserId" label="Assigned user">
            <option value="">Unassigned</option>
            {assignmentMembers(data).map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.user.name ?? member.user.email}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input name="primaryPhone" label="Phone" placeholder="801-555-0100" />
          <Input name="email" label="Email" placeholder="owner@example.com" />
          <Select name="phoneType" label="Phone type" defaultValue="unknown">
            {phoneTypes.map((type) => (
              <option key={type} value={type}>
                {label(type)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="websiteUrl" label="Website" placeholder="https://example.com" />
          <Input name="googleBusinessProfileUrl" label="Google Business Profile URL" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="ownerVerificationSource" label="Owner verification source" />
          <Input name="phoneVerificationSource" label="Phone verification source" />
        </div>
        <Select
          name="phoneVerificationMethod"
          label="Phone verification method"
          defaultValue="unverified"
        >
          {phoneVerificationMethods.map((method) => (
            <option key={method} value={method}>
              {label(method)}
            </option>
          ))}
        </Select>
        <textarea
          className="ascend-input min-h-20 py-3"
          name="sourceUrls"
          placeholder="Source URLs, one per line"
        />
        <div className="grid gap-3 sm:grid-cols-4">
          <Input name="city" label="City" placeholder="Salt Lake City" />
          <Input name="state" label="State" defaultValue="UT" />
          <Input name="nextFollowUpAt" label="Next follow-up" type="datetime-local" />
          <Input name="industry" label="Industry" defaultValue="HVAC" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input name="rating" label="Rating" placeholder="4.7" />
          <Input name="reviewCount" label="Reviews" placeholder="86" />
          <Input name="postalCode" label="Postal code" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="contactName" label="Contact name" />
          <Input name="contactEmail" label="Contact email" />
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted">
          <label className="flex items-center gap-2">
            <input name="callReady" type="checkbox" value="true" />
            Call ready
          </label>
          <label className="flex items-center gap-2 text-danger">
            <input name="doNotCall" type="checkbox" value="true" />
            Do not call
          </label>
        </div>
        <textarea className="ascend-input min-h-20 py-3" name="notes" placeholder="Notes" />
        <Button type="submit">
          <Plus aria-hidden className="h-4 w-4" />
          Add lead
        </Button>
      </form>
    </Card>
  );
}

function CsvImportPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>CSV import</CardTitle>
        <CardDescription>
          Paste rows with Business name, Phone, Website, City, State, Industry.
        </CardDescription>
      </CardHeader>
      <form action={importLeadsCsvAction} className="grid gap-3">
        <textarea
          className="ascend-input min-h-40 py-3 font-mono text-xs"
          name="csv"
          placeholder={
            "Business name,Trade,Owner name,Phone,Email,Website,Google Business Profile URL,City,State,Phone verification method,Phone verification source,Phone type,Assigned user\nWasatch Comfort Pros,HVAC,Jamie Smith,801-555-0100,owner@example.com,https://example.com,https://maps.google.com/?cid=123,Salt Lake City,UT,official_company_website,https://example.com/contact,official_company_line,Mahdy"
          }
        />
        <Button type="submit" variant="secondary">
          <FileUp aria-hidden className="h-4 w-4" />
          Import CSV
        </Button>
      </form>
    </Card>
  );
}

function LeadReviewPanel({
  data,
  canResearch,
  canConvert
}: {
  data: SalesCommandData;
  canResearch: boolean;
  canConvert: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead table</CardTitle>
        <CardDescription>
          Search, filter, sort, edit, and convert verified leads into the call queue.
        </CardDescription>
      </CardHeader>
      <form action="/app/sales" className="mb-4 grid gap-3 md:grid-cols-5">
        <Input name="q" label="Search" placeholder="Business, owner, city, phone" />
        <Select name="trade" label="Trade">
          <option value="">All trades</option>
          {crmTrades.map((trade) => (
            <option key={trade} value={trade}>
              {trade}
            </option>
          ))}
        </Select>
        <Select name="status" label="Status">
          <option value="">All statuses</option>
          <option value="call_ready">Ready to call</option>
          <option value="needs_evidence">Needs evidence</option>
          <option value="do_not_call">Do not call</option>
        </Select>
        <Select name="sort" label="Sort" defaultValue="updated">
          <option value="updated">Recently updated</option>
          <option value="score">Lead score</option>
          <option value="name">Name A-Z</option>
          <option value="follow_up">Next follow-up</option>
          <option value="last_contacted">Last contacted</option>
        </Select>
        <Button className="self-end" type="submit" variant="secondary">
          Apply
        </Button>
      </form>
      <div className="grid gap-3">
        {data.leadBusinesses.length ? (
          data.leadBusinesses.slice(0, 50).map((lead) => {
            const analysis = lead.analyses[0];
            return (
              <div className="rounded-md border border-border bg-background/35 p-4" key={lead.id}>
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{lead.businessName}</h3>
                      <span className="rounded-sm border border-border px-2 py-1 text-xs text-muted">
                        {lead.trade ?? "No trade"}
                      </span>
                      <span className="rounded-sm border border-border px-2 py-1 text-xs text-muted">
                        {lead.leadScore}/100
                      </span>
                      {lead.callReady ? (
                        <span className="rounded-sm border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          Call ready
                        </span>
                      ) : null}
                      {lead.doNotCall ? (
                        <span className="inline-flex items-center gap-1 rounded-sm border border-danger/50 bg-danger/10 px-2 py-1 text-xs font-semibold text-danger">
                          <AlertTriangle aria-hidden className="h-3 w-3" />
                          Do not call
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {[lead.ownerName, lead.city, lead.state, lead.primaryPhone]
                        .filter(Boolean)
                        .join(" • ") || "No contact details yet"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {label(lead.phoneType)} • {label(lead.phoneVerificationMethod)}
                      {lead.phoneVerificationSource ? ` • ${lead.phoneVerificationSource}` : ""}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {analysis?.researchSummary ||
                        lead.notes ||
                        "Add official phone evidence before calling."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface-raised px-3 text-sm font-semibold text-foreground transition hover:border-border-strong"
                      href={`/app/sales/leads/${lead.id}`}
                    >
                      Detail
                    </a>
                    {canResearch ? (
                      <form action={analyzeLeadAction}>
                        <input name="leadBusinessId" type="hidden" value={lead.id} />
                        <Button size="sm" type="submit" variant="secondary">
                          Analyze
                        </Button>
                      </form>
                    ) : null}
                    {canConvert && lead.callReady && !lead.doNotCall ? (
                      <form action={convertLeadToProspectAction} className="flex gap-2">
                        <input name="leadBusinessId" type="hidden" value={lead.id} />
                        <input
                          name="assignedUserId"
                          type="hidden"
                          value={lead.assignedUserId ?? ""}
                        />
                        <input
                          name="priority"
                          type="hidden"
                          value={analysis?.classification === "hot" ? "hot" : "standard"}
                        />
                        <input name="estimatedValue" type="hidden" value="5000" />
                        <input
                          name="recommendedService"
                          type="hidden"
                          value={analysis?.recommendedService ?? ""}
                        />
                        <Button size="sm" type="submit">
                          Convert
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-primary">
                    Edit lead
                  </summary>
                  <form
                    action={updateLeadBusinessAction}
                    className="mt-3 grid gap-3 md:grid-cols-3"
                  >
                    <input name="leadBusinessId" type="hidden" value={lead.id} />
                    <Input name="businessName" label="Business" defaultValue={lead.businessName} />
                    <Select name="trade" label="Trade" defaultValue={lead.trade ?? "HVAC"}>
                      {crmTrades.map((trade) => (
                        <option key={trade} value={trade}>
                          {trade}
                        </option>
                      ))}
                    </Select>
                    <Input name="ownerName" label="Owner" defaultValue={lead.ownerName ?? ""} />
                    <Input
                      name="primaryPhone"
                      label="Phone"
                      defaultValue={lead.primaryPhone ?? ""}
                    />
                    <Input name="email" label="Email" defaultValue={lead.email ?? ""} />
                    <Select name="phoneType" label="Phone type" defaultValue={lead.phoneType}>
                      {phoneTypes.map((type) => (
                        <option key={type} value={type}>
                          {label(type)}
                        </option>
                      ))}
                    </Select>
                    <Input name="websiteUrl" label="Website" defaultValue={lead.websiteUrl ?? ""} />
                    <Input
                      name="googleBusinessProfileUrl"
                      label="Google Business Profile"
                      defaultValue={lead.googleBusinessProfileUrl ?? ""}
                    />
                    <Select
                      name="phoneVerificationMethod"
                      label="Phone evidence"
                      defaultValue={lead.phoneVerificationMethod}
                    >
                      {phoneVerificationMethods.map((method) => (
                        <option key={method} value={method}>
                          {label(method)}
                        </option>
                      ))}
                    </Select>
                    <Input
                      name="ownerVerificationSource"
                      label="Owner source"
                      defaultValue={lead.ownerVerificationSource ?? ""}
                    />
                    <Input
                      name="phoneVerificationSource"
                      label="Phone source"
                      defaultValue={lead.phoneVerificationSource ?? ""}
                    />
                    <Select
                      name="assignedUserId"
                      label="Assigned"
                      defaultValue={lead.assignedUserId ?? ""}
                    >
                      <option value="">Unassigned</option>
                      {assignmentMembers(data).map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.user.name ?? member.user.email}
                        </option>
                      ))}
                    </Select>
                    <Input name="city" label="City" defaultValue={lead.city ?? ""} />
                    <Input name="state" label="State" defaultValue={lead.state ?? "UT"} />
                    <Input name="nextFollowUpAt" label="Next follow-up" type="datetime-local" />
                    <textarea
                      className="ascend-input min-h-20 py-3 md:col-span-3"
                      name="sourceUrls"
                      defaultValue={lead.sourceUrls.join("\n")}
                    />
                    <textarea
                      className="ascend-input min-h-20 py-3 md:col-span-3"
                      name="notes"
                      defaultValue={lead.notes ?? ""}
                    />
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input
                        name="callReady"
                        type="checkbox"
                        value="true"
                        defaultChecked={lead.callReady}
                      />
                      Call ready
                    </label>
                    <label className="flex items-center gap-2 text-sm text-danger">
                      <input
                        name="doNotCall"
                        type="checkbox"
                        value="true"
                        defaultChecked={lead.doNotCall}
                      />
                      Do not call
                    </label>
                    <Button type="submit">Save lead</Button>
                  </form>
                </details>
              </div>
            );
          })
        ) : (
          <Empty text="No leads yet. Create a campaign, add a manual lead, or import CSV rows." />
        )}
      </div>
    </Card>
  );
}

function QueueView({ data, permissions }: { data: SalesCommandData; permissions: string[] }) {
  const canManage =
    permissions.includes("prospects.manage_all") || permissions.includes("prospects.manage_own");
  const next = data.queue[0];
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
      <Card className="scan-line">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Today’s queue</CardTitle>
              <CardDescription>
                Prioritized by due follow-ups, owner reach, need score, attempts, and deal value.
              </CardDescription>
            </div>
            <a
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-background transition hover:bg-primary-soft"
              href="/app/call-desk"
            >
              <PhoneCall aria-hidden className="h-4 w-4" />
              Speed dial
            </a>
          </div>
        </CardHeader>
        {next ? (
          <div className="mb-4 rounded-md border border-primary/40 bg-primary/10 p-4">
            <p className="text-xs font-semibold uppercase text-muted">Next best call</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-lg font-semibold">{next.leadBusiness.businessName}</p>
                <p className="text-sm text-muted">
                  {[next.leadBusiness.city, next.leadBusiness.state, next.leadBusiness.primaryPhone]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
              {next.leadBusiness.primaryPhone ? (
                <a
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-background"
                  href={telUrl(next.leadBusiness.primaryPhone)}
                >
                  <PhoneCall aria-hidden className="h-4 w-4" />
                  Call now
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="grid gap-3">
          {data.queue.length ? (
            data.queue.map((prospect) => (
              <ProspectRow key={prospect.id} prospect={prospect} canManage={canManage} />
            ))
          ) : (
            <Empty text="No callable prospects are available in the current permission scope." />
          )}
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Disposition</CardTitle>
          <CardDescription>Record the result after using the click-to-call link.</CardDescription>
        </CardHeader>
        {data.queue[0] ? (
          <DispositionForm prospectId={data.queue[0].id} />
        ) : (
          <Empty text="Queue is empty." />
        )}
      </Card>
    </div>
  );
}

function ProspectRow({
  prospect,
  canManage
}: {
  prospect: SalesCommandData["prospects"][number];
  canManage: boolean;
}) {
  const analysis = prospect.leadBusiness.analyses[0];
  return (
    <div className="rounded-md border border-border bg-background/35 p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{prospect.leadBusiness.businessName}</h3>
            <span className="rounded-sm border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              {label(prospect.priority)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs text-muted">
              <Gauge aria-hidden className="h-3 w-3" />
              {prospect.attemptCount} tries
            </span>
            {analysis ? (
              <span className="rounded-sm border border-border px-2 py-1 text-xs text-muted">
                {analysis.overallFitScore}/100 fit
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">
            {[
              prospect.leadBusiness.city,
              prospect.leadBusiness.state,
              prospect.leadBusiness.primaryPhone
            ]
              .filter(Boolean)
              .join(" • ")}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {analysis?.researchSummary || prospect.notes || "No research summary yet."}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <MiniSignal label="Status" value={label(prospect.status)} />
            <MiniSignal
              label="Next action"
              value={prospect.nextActionAt ? prospect.nextActionAt.toLocaleString() : "Call now"}
            />
            <MiniSignal
              label="Service"
              value={prospect.recommendedService || analysis?.recommendedService || "Growth system"}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {prospect.leadBusiness.primaryPhone ? (
            <a
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-background"
              href={telUrl(prospect.leadBusiness.primaryPhone)}
            >
              <PhoneCall aria-hidden className="h-4 w-4" />
              Call
            </a>
          ) : null}
          {canManage ? (
            <form action={updateProspectAction} className="flex gap-2">
              <input name="prospectId" type="hidden" value={prospect.id} />
              <input name="status" type="hidden" value="attempting_contact" />
              <input name="priority" type="hidden" value={prospect.priority} />
              <Button size="sm" type="submit" variant="secondary">
                Load
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MiniSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/70 p-2">
      <p className="text-[10px] font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 break-words text-xs text-foreground">{value}</p>
    </div>
  );
}

function DispositionForm({ prospectId }: { prospectId: string }) {
  return (
    <form action={recordOutreachAttemptAction} className="grid gap-3">
      <input name="prospectId" type="hidden" value={prospectId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select name="channel" label="Channel" defaultValue="phone">
          {outreachChannels.map((channel) => (
            <option key={channel} value={channel}>
              {label(channel)}
            </option>
          ))}
        </Select>
        <Select name="outcome" label="Outcome" defaultValue="no_answer">
          {outreachOutcomes.map((outcome) => (
            <option key={outcome} value={outcome}>
              {label(outcome)}
            </option>
          ))}
        </Select>
      </div>
      <Input name="durationSeconds" label="Duration seconds" placeholder="180" />
      <textarea
        className="ascend-input min-h-24 py-3"
        name="notes"
        placeholder="Conversation notes"
      />
      <Button type="submit">
        <CheckCircle2 aria-hidden className="h-4 w-4" />
        Save disposition
      </Button>
    </form>
  );
}

function FollowUpsView({ data }: { data: SalesCommandData }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Follow-ups</CardTitle>
          <CardDescription>
            Today, overdue, upcoming, completed, and cancelled states are stored.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3">
          {data.followUps.map((followUp) => (
            <div className="rounded-md border border-border bg-background/35 p-4" key={followUp.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{followUp.prospect.leadBusiness.businessName}</p>
                  <p className="text-sm text-muted">
                    {label(followUp.type)} due {followUp.dueAt.toLocaleString()}
                  </p>
                  {followUp.notes ? (
                    <p className="mt-1 text-sm text-muted">{followUp.notes}</p>
                  ) : null}
                </div>
                {followUp.status === "open" ? (
                  <form action={completeFollowUpAction}>
                    <input name="followUpId" type="hidden" value={followUp.id} />
                    <Button size="sm" type="submit" variant="secondary">
                      Complete
                    </Button>
                  </form>
                ) : (
                  <span className="text-sm text-muted">{label(followUp.status)}</span>
                )}
              </div>
            </div>
          ))}
          {!data.followUps.length ? <Empty text="No follow-ups in this scope." /> : null}
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Create follow-up</CardTitle>
        </CardHeader>
        {data.prospects[0] ? (
          <form action={createFollowUpAction} className="grid gap-3">
            <Select name="prospectId" label="Prospect">
              {data.prospects.map((prospect) => (
                <option key={prospect.id} value={prospect.id}>
                  {prospect.leadBusiness.businessName}
                </option>
              ))}
            </Select>
            <Input name="dueAt" label="Due date/time" type="datetime-local" />
            <Select name="type" label="Type" defaultValue="call">
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="proposal">Proposal</option>
              <option value="general">General</option>
            </Select>
            <Select name="priority" label="Priority" defaultValue="standard">
              {prospectPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {label(priority)}
                </option>
              ))}
            </Select>
            <textarea className="ascend-input min-h-20 py-3" name="notes" placeholder="Notes" />
            <Button type="submit">Create follow-up</Button>
          </form>
        ) : (
          <Empty text="Create a prospect before adding follow-ups." />
        )}
      </Card>
    </div>
  );
}

function AppointmentsView({ data, canManage }: { data: SalesCommandData; canManage: boolean }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
          <CardDescription>
            Internal booking is active. Calendar sync is prepared, not enabled.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3">
          {data.appointments.map((appointment) => (
            <div
              className="rounded-md border border-border bg-background/35 p-4"
              key={appointment.id}
            >
              <p className="font-semibold">{appointment.title}</p>
              <p className="text-sm text-muted">
                {appointment.prospect.leadBusiness.businessName} •{" "}
                {appointment.startAt.toLocaleString()} • {label(appointment.status)}
              </p>
            </div>
          ))}
          {!data.appointments.length ? <Empty text="No appointments yet." /> : null}
        </div>
      </Card>
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Book appointment</CardTitle>
          </CardHeader>
          {data.prospects[0] ? (
            <form action={createAppointmentAction} className="grid gap-3">
              <Select name="prospectId" label="Prospect">
                {data.prospects.map((prospect) => (
                  <option key={prospect.id} value={prospect.id}>
                    {prospect.leadBusiness.businessName}
                  </option>
                ))}
              </Select>
              <Input name="title" label="Title" defaultValue="Sales call" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="startAt" label="Start" type="datetime-local" />
                <Input name="endAt" label="End" type="datetime-local" />
              </div>
              <Input name="timezone" label="Timezone" defaultValue="America/Denver" />
              <Select name="meetingType" label="Type" defaultValue="sales_call">
                {meetingTypes.map((type) => (
                  <option key={type} value={type}>
                    {label(type)}
                  </option>
                ))}
              </Select>
              <Select name="status" label="Status" defaultValue="scheduled">
                {appointmentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {label(status)}
                  </option>
                ))}
              </Select>
              <Input name="meetingUrl" label="Meeting URL" />
              <textarea className="ascend-input min-h-20 py-3" name="notes" placeholder="Notes" />
              <Button type="submit">Book appointment</Button>
            </form>
          ) : (
            <Empty text="Create a prospect before booking appointments." />
          )}
        </Card>
      ) : null}
    </div>
  );
}

function PipelineView({
  data,
  canManage,
  canRevenueHandoff
}: {
  data: SalesCommandData;
  canManage: boolean;
  canRevenueHandoff: boolean;
}) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 xl:grid-cols-5">
        {data.pipeline.stages.slice(0, 15).map((stage) => {
          const items = data.opportunities.filter(
            (opportunity) => opportunity.pipelineStageId === stage.id
          );
          return (
            <Card className="min-h-56 p-4" key={stage.id}>
              <div className="mb-3">
                <p className="text-sm font-semibold">{stage.name}</p>
                <p className="text-xs text-muted">
                  {items.length} •{" "}
                  {formatMoney(items.reduce((total, item) => total + item.estimatedValueCents, 0))}
                </p>
              </div>
              <div className="grid gap-2">
                {items.map((opportunity) => (
                  <div
                    className="rounded-md border border-border bg-background/40 p-3"
                    key={opportunity.id}
                  >
                    <p className="text-sm font-semibold">{opportunity.name}</p>
                    <p className="text-xs text-muted">
                      {formatMoney(opportunity.estimatedValueCents)} •{" "}
                      {opportunity.probabilityPercent}% •{" "}
                      {opportunity.prospect.leadBusiness.businessName}
                    </p>
                    {canManage ? (
                      <StageMover opportunity={opportunity} stages={data.pipeline.stages} />
                    ) : null}
                    {canRevenueHandoff &&
                    opportunity.status === "won" &&
                    !opportunity.revenueContracts.length ? (
                      <RevenueHandoffForm opportunity={opportunity} services={data.services} />
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      {canManage ? <CreateOpportunityPanel data={data} /> : null}
    </div>
  );
}

function StageMover({
  opportunity,
  stages
}: {
  opportunity: SalesCommandData["opportunities"][number];
  stages: SalesCommandData["pipeline"]["stages"];
}) {
  const currentIndex = stages.findIndex((stage) => stage.id === opportunity.pipelineStageId);
  const previousStage = currentIndex > 0 ? stages[currentIndex - 1] : null;
  const nextStage =
    currentIndex >= 0 && currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;

  return (
    <div className="mt-3 grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <QuickStageButton
          disabled={!previousStage}
          icon="back"
          label={previousStage ? previousStage.name : "First stage"}
          opportunityId={opportunity.id}
          stageId={previousStage?.id ?? opportunity.pipelineStageId}
        />
        <QuickStageButton
          disabled={!nextStage}
          icon="next"
          label={nextStage ? nextStage.name : "Final stage"}
          opportunityId={opportunity.id}
          stageId={nextStage?.id ?? opportunity.pipelineStageId}
        />
      </div>
      <form action={moveOpportunityStageAction} className="grid gap-2">
        <input name="opportunityId" type="hidden" value={opportunity.id} />
        <Select name="pipelineStageId" label="Move to" defaultValue={opportunity.pipelineStageId}>
          {stages.map((targetStage) => (
            <option key={targetStage.id} value={targetStage.id}>
              {targetStage.name}
            </option>
          ))}
        </Select>
        <Button size="sm" type="submit" variant="secondary">
          Move
        </Button>
      </form>
    </div>
  );
}

function QuickStageButton({
  disabled,
  icon,
  label,
  opportunityId,
  stageId
}: {
  disabled: boolean;
  icon: "back" | "next";
  label: string;
  opportunityId: string;
  stageId: string;
}) {
  const Icon = icon === "back" ? ArrowLeft : ArrowRight;
  return (
    <form action={moveOpportunityStageAction}>
      <input name="opportunityId" type="hidden" value={opportunityId} />
      <input name="pipelineStageId" type="hidden" value={stageId} />
      <Button className="w-full" disabled={disabled} size="sm" type="submit" variant="secondary">
        <Icon aria-hidden className="h-4 w-4" />
        {label}
      </Button>
    </form>
  );
}

function CreateOpportunityPanel({ data }: { data: SalesCommandData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create opportunity</CardTitle>
      </CardHeader>
      {data.prospects[0] ? (
        <form action={createOpportunityAction} className="grid gap-3 md:grid-cols-3">
          <Select name="prospectId" label="Prospect">
            {data.prospects.map((prospect) => (
              <option key={prospect.id} value={prospect.id}>
                {prospect.leadBusiness.businessName}
              </option>
            ))}
          </Select>
          <Select name="pipelineStageId" label="Stage">
            {data.pipeline.stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </Select>
          <Input name="name" label="Opportunity name" defaultValue="Growth system opportunity" />
          <Input name="estimatedValue" label="Estimated value" defaultValue="5000" />
          <Input name="probabilityPercent" label="Probability" defaultValue="30" />
          <Input name="expectedCloseDate" label="Expected close" type="date" />
          <Select name="serviceOfferingId" label="Service">
            <option value="">No service selected</option>
            {data.services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </Select>
          <Button className="self-end" type="submit">
            Create opportunity
          </Button>
        </form>
      ) : (
        <Empty text="Create a prospect before adding opportunities." />
      )}
    </Card>
  );
}

function RevenueHandoffForm({
  opportunity,
  services
}: {
  opportunity: SalesCommandData["opportunities"][number];
  services: SalesCommandData["services"];
}) {
  return (
    <form action={createRevenueHandoffAction} className="mt-3 grid gap-2">
      <input name="opportunityId" type="hidden" value={opportunity.id} />
      <Input
        name="businessName"
        label="Client name"
        defaultValue={opportunity.prospect.leadBusiness.businessName}
      />
      <Input name="contractName" label="Contract" defaultValue={opportunity.name} />
      <Input
        name="contractedAmount"
        label="Amount"
        defaultValue={String(opportunity.estimatedValueCents / 100)}
      />
      <Input name="depositAmount" label="Deposit" placeholder="1000" />
      <Input name="startDate" label="Start" type="date" />
      <Select name="billingType" label="Billing" defaultValue="project">
        <option value="project">Project</option>
        <option value="recurring">Recurring</option>
        <option value="one_time">One time</option>
      </Select>
      <Select name="serviceOfferingId" label="Service">
        <option value="">No service selected</option>
        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.name}
          </option>
        ))}
      </Select>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input name="createInitialInvoice" type="checkbox" value="true" />
        Create initial invoice
      </label>
      <Button size="sm" type="submit">
        Revenue handoff
      </Button>
    </form>
  );
}

function PerformanceView({
  data,
  canManageGoals
}: {
  data: SalesCommandData;
  canManageGoals: boolean;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Sales performance</CardTitle>
          <CardDescription>
            Rates show insufficient data as zero until real activity exists.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Metric
            label="Conversations"
            value={String(data.metrics.conversations)}
            caption={`${data.metrics.conversationRate}%`}
          />
          <Metric
            label="Booked"
            value={String(data.metrics.appointmentsBooked)}
            caption={`${data.metrics.bookingRate}%`}
          />
          <Metric
            label="Held"
            value={String(data.metrics.appointmentsHeld)}
            caption={`${data.metrics.showRate}% show`}
          />
          <Metric
            label="Wins"
            value={String(data.metrics.wins)}
            caption={`${data.metrics.closeRate}% close`}
          />
          <Metric label="Won revenue" value={formatMoney(data.metrics.wonRevenueCents)} />
          <Metric label="Avg deal" value={formatMoney(data.metrics.averageDealValueCents)} />
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sales goals</CardTitle>
          <CardDescription>
            Default targets are configurable operating targets, not guarantees.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-2">
          {data.salesGoals.map((goal) => (
            <div className="rounded-md border border-border bg-background/35 p-3" key={goal.id}>
              <p className="text-sm font-semibold">{label(goal.metric)}</p>
              <p className="text-xs text-muted">
                {goal.targetValue} target • {label(goal.periodType)}
              </p>
            </div>
          ))}
        </div>
        {canManageGoals ? (
          <form action={createSalesGoalAction} className="mt-4 grid gap-3">
            <Select name="metric" label="Metric" defaultValue="outreach_attempts">
              {salesGoalMetrics.map((metric) => (
                <option key={metric} value={metric}>
                  {label(metric)}
                </option>
              ))}
            </Select>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input name="targetValue" label="Target" defaultValue="100" />
              <Input name="startDate" label="Start" type="date" />
              <Input name="endDate" label="End" type="date" />
            </div>
            <input name="periodType" type="hidden" value="daily" />
            <Button type="submit">Create goal</Button>
          </form>
        ) : null}
      </Card>
    </div>
  );
}

function AttentionPanel({ data }: { data: SalesCommandData }) {
  const items = [
    ["Queue below target", data.attention.queueBelowTarget ? "Needs lead supply" : "Healthy"],
    ["Overdue follow-ups", String(data.attention.overdueFollowUps)],
    ["Unassigned prospects", String(data.attention.unassignedProspects)],
    ["Leads awaiting research", String(data.attention.leadsAwaitingResearch)],
    ["Needs review", String(data.attention.leadsRequiringReview)],
    ["Stale opportunities", String(data.attention.staleOpportunities)]
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attention required</CardTitle>
      </CardHeader>
      <div className="grid gap-2">
        {items.map(([title, value]) => (
          <div
            className="flex items-center justify-between rounded-md border border-border bg-background/35 p-3"
            key={title}
          >
            <span className="text-sm text-muted">{title}</span>
            <span className="text-sm font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CampaignList({ data }: { data: SalesCommandData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaigns</CardTitle>
      </CardHeader>
      <div className="grid gap-2">
        {data.campaigns.map((campaign) => (
          <div className="rounded-md border border-border bg-background/35 p-3" key={campaign.id}>
            <p className="text-sm font-semibold">{campaign.name}</p>
            <p className="text-xs text-muted">
              {label(campaign.status)} • {campaign.memberships.length} leads •{" "}
              {campaign.sourceProvider}
            </p>
            {campaign.jobs[0]?.errorMessage ? (
              <p className="mt-1 text-xs text-warning">{campaign.jobs[0].errorMessage}</p>
            ) : null}
          </div>
        ))}
        {!data.campaigns.length ? <Empty text="No campaigns yet." /> : null}
      </div>
    </Card>
  );
}

function JobPanel({ data }: { data: SalesCommandData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider and worker jobs</CardTitle>
        <CardDescription>
          Jobs are persisted and can be processed by a secure worker endpoint.
        </CardDescription>
      </CardHeader>
      <div className="grid gap-2">
        {data.jobs.slice(0, 6).map((job) => (
          <div className="rounded-md border border-border bg-background/35 p-3" key={job.id}>
            <p className="text-sm font-semibold">{label(job.type)}</p>
            <p className="text-xs text-muted">
              {label(job.status)} • {job.progressCurrent}/{job.progressTotal}
            </p>
            {job.errorMessage ? (
              <p className="mt-1 text-xs text-warning">{job.errorMessage}</p>
            ) : null}
          </div>
        ))}
        {!data.jobs.length ? <Empty text="No background jobs yet." /> : null}
      </div>
    </Card>
  );
}

function Score({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "hot";
}) {
  return (
    <Card className={cn("min-h-32 p-4", tone === "hot" && "border-primary/45 bg-primary/5")}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/45 text-primary">
        <Icon aria-hidden className="h-4 w-4" />
      </div>
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

function Metric({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div className="rounded-md border border-border bg-background/35 p-3">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {caption ? <p className="text-xs text-muted">{caption}</p> : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-background/25 p-4 text-sm text-muted">
      {text}
    </div>
  );
}

function label(value: string) {
  return salesLabelByValue[value] ?? labelize(value);
}

function assignmentMembers(data: SalesCommandData) {
  const assigned = data.members.filter((member) => {
    const name = (member.user.name ?? member.user.email).toLowerCase();
    return name.includes("mahdy") || name.includes("logan");
  });
  return assigned.length ? assigned : data.members;
}
