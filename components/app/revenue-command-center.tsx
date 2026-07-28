import { randomUUID } from "crypto";
import {
  AlertCircle,
  ArrowUpRight,
  Banknote,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Gauge,
  Plus,
  ReceiptText,
  Repeat2,
  Target,
  TrendingUp,
  UsersRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  createAdjustmentAction,
  createClientAction,
  createContractAction,
  createDefaultServicesAction,
  createForecastSnapshotAction,
  createInvoiceAction,
  createRecurringRevenueAction,
  createRevenuePriorityAction,
  createServiceOfferingAction,
  recordPaymentAction,
  upsertRevenueGoalAction
} from "@/app/(app)/app/revenue/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { RevenueCommandData } from "@/lib/server/revenue";
import { labelByValue } from "@/lib/revenue/constants";
import {
  adjustmentTypes,
  billingTypes,
  clientStatuses,
  contractStatuses,
  invoiceStatuses,
  paymentMethods,
  paymentStatuses,
  recurringFrequencies,
  recurringStatuses,
  revenueGoalPeriods,
  revenueGoalTypes,
  serviceCategories
} from "@/lib/revenue/constants";
import { dateInputValue } from "@/lib/revenue/periods";
import { formatMoney, formatPercent, labelize } from "@/lib/revenue/formatting";
import { cn } from "@/lib/utils";

type RevenueCommandCenterProps = {
  data: RevenueCommandData;
  permissions: string[];
};

export function RevenueCommandCenter({ data, permissions }: RevenueCommandCenterProps) {
  const canManageRevenue = permissions.includes("revenue.manage");
  const canManageGoals = permissions.includes("revenue.goals.manage");
  const canManageClients = permissions.includes("clients.manage");
  const canManageServices = permissions.includes("services.manage");
  const canManageContracts = permissions.includes("revenue.contracts.manage");
  const canManageInvoices = permissions.includes("revenue.invoices.manage");
  const canManagePayments = permissions.includes("revenue.payments.manage");
  const canManageForecasts = permissions.includes("revenue.forecasts.manage");
  const progress = data.progress;

  return (
    <section className="reveal-up grid gap-6">
      <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold text-primary">Revenue Command Center</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal text-foreground md:text-5xl">
            Financial operating center
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">
            Manual revenue tracking is active. Stripe is not connected yet, and every number below
            comes from stored Ascend OS records.
          </p>
        </div>
        <a
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-4 text-sm font-semibold text-foreground transition hover:border-border-strong hover:bg-surface-elevated"
          href="/app/revenue/export?type=payments"
        >
          <Download aria-hidden className="h-4 w-4" />
          Export CSV
        </a>
      </header>

      <Card className="scan-line overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold text-primary">Main revenue goal</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">
              {data.primaryGoal
                ? `${formatMoney(data.scorecards.collectedCents)} collected of ${formatMoney(
                    data.primaryGoal.targetAmountCents
                  )}`
                : "Set the monthly cash-collected goal"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {data.primaryGoal
                ? `${formatMoney(progress?.remainingAmountCents ?? 0)} remaining. ${progress?.remainingDays ?? 0} days left in this period.`
                : "This creates the pacing target used by forecasts, scorecards, and recommendations."}
            </p>
            <div className="mt-5 h-3 overflow-hidden rounded-full border border-border bg-background">
              <div
                className={cn(
                  "h-full rounded-full bg-primary transition-all",
                  progress?.status === "behind" && "bg-warning"
                )}
                style={{ width: `${Math.min(100, progress?.progressPercent ?? 0)}%` }}
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Metric label="Progress" value={formatPercent(progress?.progressPercent ?? 0)} />
              <Metric
                label="Required pace"
                value={formatMoney(progress?.requiredDailyPaceCents ?? 0)}
                caption="/ day"
              />
              <Metric
                label="Current pace"
                value={formatMoney(progress?.currentDailyPaceCents ?? 0)}
                caption="/ day"
              />
              <Metric label="Status" value={progress ? labelize(progress.status) : "No goal"} />
            </div>
          </div>
          {canManageGoals ? (
            <QuickPanel title="Update goal" icon={Target}>
              <form action={upsertRevenueGoalAction} className="grid gap-3">
                <Input name="name" label="Goal name" defaultValue="Monthly cash collected" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select name="goalType" label="Goal type" defaultValue="cash_collected">
                    {revenueGoalTypes.map((type) => (
                      <option key={type} value={type}>
                        {labelByValue[type]}
                      </option>
                    ))}
                  </Select>
                  <Select name="goalPeriod" label="Period" defaultValue="monthly">
                    {revenueGoalPeriods.map((period) => (
                      <option key={period} value={period}>
                        {labelByValue[period]}
                      </option>
                    ))}
                  </Select>
                </div>
                <Input name="targetAmount" label="Target amount" placeholder="50000" />
                <textarea
                  className="min-h-20 rounded-md border border-border bg-surface-raised/80 p-3 text-sm text-foreground outline-none focus:border-primary"
                  name="notes"
                  placeholder="Notes"
                />
                <Button type="submit">
                  <Target aria-hidden className="h-4 w-4" />
                  Save goal
                </Button>
              </form>
            </QuickPanel>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Score
          label="Cash collected"
          value={formatMoney(data.scorecards.collectedCents)}
          icon={Banknote}
        />
        <Score
          label="Contracted"
          value={formatMoney(data.scorecards.contractedCents)}
          icon={FileText}
        />
        <Score
          label="Expected cash"
          value={formatMoney(data.scorecards.expectedCents)}
          icon={CalendarClock}
        />
        <Score label="MRR" value={formatMoney(data.scorecards.mrrCents)} icon={Repeat2} />
        <Score
          label="Outstanding"
          value={formatMoney(data.scorecards.outstandingCents)}
          icon={ReceiptText}
        />
        <Score
          label="Overdue"
          value={formatMoney(data.scorecards.overdueCents)}
          icon={AlertCircle}
          tone="warn"
        />
        <Score label="New MRR" value={formatMoney(data.scorecards.newMrrCents)} icon={TrendingUp} />
        <Score
          label="Avg client value"
          value={formatMoney(data.scorecards.averageClientValueCents)}
          icon={UsersRound}
        />
        <Score
          label="Active clients"
          value={String(data.scorecards.activeClients)}
          icon={CheckCircle2}
        />
        <Score
          label="Refunds/write-offs"
          value={formatMoney(data.scorecards.refundCents)}
          icon={Gauge}
          tone="warn"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.86fr]">
        <Card className="scan-line">
          <CardHeader>
            <CardTitle>Forecast</CardTitle>
            <CardDescription>
              Deterministic forecast based on collected payments, open invoices, recurring revenue,
              and signed contracts.
            </CardDescription>
          </CardHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Worst case" value={formatMoney(data.forecast.worstCaseAmountCents)} />
            <Metric label="Expected" value={formatMoney(data.forecast.expectedAmountCents)} />
            <Metric label="Best case" value={formatMoney(data.forecast.bestCaseAmountCents)} />
          </div>
          <ul className="mt-5 grid gap-2 text-sm text-muted">
            {data.forecast.assumptions.map((assumption) => (
              <li className="rounded-md border border-border bg-background/35 p-3" key={assumption}>
                {assumption}
              </li>
            ))}
          </ul>
          {canManageForecasts ? (
            <form action={createForecastSnapshotAction} className="mt-4">
              <Button type="submit" variant="secondary">
                <ClipboardList aria-hidden className="h-4 w-4" />
                Create snapshot
              </Button>
            </form>
          ) : null}
        </Card>

        <Card className="scan-line">
          <CardHeader>
            <CardTitle>Ascend revenue recommendations</CardTitle>
            <CardDescription>Ranked by impact, urgency, and collection likelihood.</CardDescription>
          </CardHeader>
          <div className="grid gap-3">
            {data.recommendations.length ? (
              data.recommendations.map((recommendation) => (
                <div
                  className="rounded-md border border-border bg-background/35 p-3"
                  key={recommendation.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{recommendation.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">{recommendation.reason}</p>
                    </div>
                    <span className="rounded-sm border border-border bg-surface px-2 py-1 text-xs text-muted">
                      {formatMoney(recommendation.estimatedImpactCents)}
                    </span>
                  </div>
                  <form action={createRevenuePriorityAction} className="mt-3">
                    <input name="title" type="hidden" value={recommendation.title} />
                    <input name="reason" type="hidden" value={recommendation.reason} />
                    <input
                      name="impactCents"
                      type="hidden"
                      value={recommendation.estimatedImpactCents}
                    />
                    <input
                      name="entityType"
                      type="hidden"
                      value={recommendation.entityType ?? ""}
                    />
                    <input name="entityId" type="hidden" value={recommendation.entityId ?? ""} />
                    <Button size="sm" type="submit" variant="secondary">
                      <Plus aria-hidden className="h-4 w-4" />
                      Add priority
                    </Button>
                  </form>
                </div>
              ))
            ) : (
              <EmptyMessage text="No revenue recommendations yet. Add invoices, payments, or a goal to generate actions." />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <CardTitle>Manual revenue workflows</CardTitle>
            <CardDescription>Add the real records that drive every total.</CardDescription>
          </CardHeader>
          <div className="grid gap-3">
            {canManageServices && data.serviceOfferings.length === 0 ? (
              <form action={createDefaultServicesAction}>
                <Button type="submit" variant="secondary">
                  <Plus aria-hidden className="h-4 w-4" />
                  Add starter services
                </Button>
              </form>
            ) : null}
            {canManageClients ? <ClientForm /> : null}
            {canManageServices ? <ServiceForm /> : null}
            {canManageContracts ? <ContractForm data={data} /> : null}
            {canManageInvoices ? <InvoiceForm data={data} /> : null}
            {canManagePayments ? <PaymentForm data={data} /> : null}
            {canManageRevenue ? <RecurringForm data={data} /> : null}
            {canManagePayments ? <AdjustmentForm data={data} /> : null}
          </div>
        </Card>

        <div className="grid gap-6">
          <Panel title="Attention required" empty={!attentionRows(data).length}>
            {attentionRows(data).map((row) => (
              <div
                className="grid gap-2 rounded-md border border-border bg-background/35 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                key={row.key}
              >
                <div>
                  <p className="text-sm font-semibold">{row.title}</p>
                  <p className="mt-1 text-xs text-muted">{row.description}</p>
                </div>
                <span className="text-sm font-semibold">{formatMoney(row.amountCents)}</span>
              </div>
            ))}
          </Panel>
          <Panel title="Revenue timeline" empty={!data.timeline.length}>
            {data.timeline.map((item) => (
              <div
                className="grid grid-cols-[7rem_1fr_auto] gap-3 rounded-md border border-border bg-background/35 p-3 text-sm"
                key={item.id}
              >
                <span className="text-muted">{dateInputValue(item.date)}</span>
                <span>{item.label}</span>
                <span className="font-semibold">{formatMoney(item.amountCents)}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Composition title="Revenue by service" rows={data.composition.byService} />
        <Composition title="Revenue by client" rows={data.composition.byClient} />
        <Composition title="One-time versus recurring" rows={data.composition.byBillingType} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Recent revenue activity" empty={!data.recentActivity.length}>
          {data.recentActivity.map((event) => (
            <div className="rounded-md border border-border bg-background/35 p-3" key={event.id}>
              <p className="text-sm font-semibold">
                {labelize(event.action.replace("revenue.", ""))}
              </p>
              <p className="mt-1 text-xs text-muted">{event.createdAt.toLocaleString("en-US")}</p>
            </div>
          ))}
        </Panel>
        <Panel title="Revenue notifications" empty={!data.notifications.length}>
          {data.notifications.map((notification) => (
            <div
              className="rounded-md border border-border bg-background/35 p-3"
              key={`${notification.type}-${notification.entityId ?? notification.title}`}
            >
              <div className="flex items-start gap-3">
                <Bell aria-hidden className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{notification.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{notification.body}</p>
                </div>
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </section>
  );
}

function ClientForm() {
  return (
    <Workflow title="Add client">
      <form action={createClientAction} className="grid gap-3">
        <Input name="businessName" label="Business name" required />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="contactName" label="Contact name" />
          <Input name="contactEmail" label="Email" type="email" />
          <Input name="contactPhone" label="Phone" />
          <Select name="status" label="Status" defaultValue="prospect">
            {clientStatuses.map((status) => (
              <option key={status} value={status}>
                {labelByValue[status]}
              </option>
            ))}
          </Select>
        </div>
        <Input name="source" label="Source" />
        <TextArea name="notes" />
        <Button type="submit">Add client</Button>
      </form>
    </Workflow>
  );
}

function ServiceForm() {
  return (
    <Workflow title="Add service">
      <form action={createServiceOfferingAction} className="grid gap-3">
        <Input name="name" label="Service name" required />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select name="revenueCategory" label="Category" defaultValue="website">
            {serviceCategories.map((category) => (
              <option key={category} value={category}>
                {labelByValue[category]}
              </option>
            ))}
          </Select>
          <Select name="billingType" label="Billing" defaultValue="one_time">
            {billingTypes.map((type) => (
              <option key={type} value={type}>
                {labelByValue[type]}
              </option>
            ))}
          </Select>
          <Input name="defaultPrice" label="Default price" />
        </div>
        <TextArea name="description" placeholder="Description" />
        <Button type="submit">Save service</Button>
      </form>
    </Workflow>
  );
}

function ContractForm({ data }: { data: RevenueCommandData }) {
  return (
    <Workflow title="Add contract">
      <form action={createContractAction} className="grid gap-3">
        <Select name="clientId" label="Client" required>
          <ClientOptions data={data} />
        </Select>
        <Input name="name" label="Contract name" required />
        <Select name="serviceOfferingId" label="Service">
          <option value="">Unassigned</option>
          {data.serviceOfferings.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </Select>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input name="contractedAmount" label="Contracted amount" required />
          <Select name="billingType" label="Billing" defaultValue="one_time">
            {billingTypes.map((type) => (
              <option key={type} value={type}>
                {labelByValue[type]}
              </option>
            ))}
          </Select>
          <Select name="status" label="Status" defaultValue="signed">
            {contractStatuses.map((status) => (
              <option key={status} value={status}>
                {labelByValue[status]}
              </option>
            ))}
          </Select>
          <Input name="depositAmount" label="Deposit" />
          <Input name="mrrAmount" label="MRR amount" />
          <Input name="signedDate" label="Signed date" type="date" />
          <Input name="startDate" label="Start" type="date" />
          <Input name="endDate" label="End" type="date" />
        </div>
        <TextArea name="notes" />
        <Button type="submit">Create contract</Button>
      </form>
    </Workflow>
  );
}

function InvoiceForm({ data }: { data: RevenueCommandData }) {
  return (
    <Workflow title="Add invoice">
      <form action={createInvoiceAction} className="grid gap-3">
        <Select name="clientId" label="Client" required>
          <ClientOptions data={data} />
        </Select>
        <Select name="revenueContractId" label="Contract">
          <option value="">No contract</option>
          {data.contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.name}
            </option>
          ))}
        </Select>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="invoiceNumber" label="Invoice number" />
          <Input name="totalAmount" label="Amount" required />
          <Input
            name="issueDate"
            label="Issue date"
            type="date"
            defaultValue={dateInputValue(new Date())}
            required
          />
          <Input name="dueDate" label="Due date" type="date" required />
          <Select name="status" label="Status" defaultValue="open">
            {invoiceStatuses.map((status) => (
              <option key={status} value={status}>
                {labelByValue[status]}
              </option>
            ))}
          </Select>
        </div>
        <TextArea name="notes" />
        <Button type="submit">Create invoice</Button>
      </form>
    </Workflow>
  );
}

function PaymentForm({ data }: { data: RevenueCommandData }) {
  return (
    <Workflow title="Record payment">
      <form action={recordPaymentAction} className="grid gap-3">
        <input name="idempotencyKey" type="hidden" value={randomUUID()} />
        <Select name="clientId" label="Client" required>
          <ClientOptions data={data} />
        </Select>
        <Select name="invoiceId" label="Invoice">
          <option value="">No invoice</option>
          {data.invoices
            .filter(
              (invoice) => !["paid", "void", "uncollectible", "archived"].includes(invoice.status)
            )
            .map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoiceNumber || invoice.client.businessName} ·{" "}
                {formatMoney(invoice.amountOutstandingCents)}
              </option>
            ))}
        </Select>
        <Select name="revenueContractId" label="Contract">
          <option value="">No contract</option>
          {data.contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.name}
            </option>
          ))}
        </Select>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input name="amount" label="Amount" required />
          <Input
            name="paymentDate"
            label="Payment date"
            type="date"
            defaultValue={dateInputValue(new Date())}
            required
          />
          <Select name="status" label="Status" defaultValue="succeeded">
            {paymentStatuses.map((status) => (
              <option key={status} value={status}>
                {labelByValue[status]}
              </option>
            ))}
          </Select>
          <Select name="paymentMethod" label="Method" defaultValue="card">
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {labelByValue[method]}
              </option>
            ))}
          </Select>
        </div>
        <TextArea name="notes" />
        <Button type="submit">Record payment</Button>
      </form>
    </Workflow>
  );
}

function RecurringForm({ data }: { data: RevenueCommandData }) {
  return (
    <Workflow title="Add recurring revenue">
      <form action={createRecurringRevenueAction} className="grid gap-3">
        <Select name="clientId" label="Client" required>
          <ClientOptions data={data} />
        </Select>
        <Select name="revenueContractId" label="Contract" required>
          {data.contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.name}
            </option>
          ))}
        </Select>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input name="amount" label="Amount" required />
          <Select name="frequency" label="Frequency" defaultValue="monthly">
            {recurringFrequencies.map((frequency) => (
              <option key={frequency} value={frequency}>
                {labelByValue[frequency]}
              </option>
            ))}
          </Select>
          <Select name="status" label="Status" defaultValue="active">
            {recurringStatuses.map((status) => (
              <option key={status} value={status}>
                {labelByValue[status]}
              </option>
            ))}
          </Select>
          <Input
            name="startDate"
            label="Start date"
            type="date"
            defaultValue={dateInputValue(new Date())}
            required
          />
          <Input name="nextExpectedDate" label="Next expected" type="date" required />
          <Input name="endDate" label="End date" type="date" />
        </div>
        <Button type="submit">Add recurring revenue</Button>
      </form>
    </Workflow>
  );
}

function AdjustmentForm({ data }: { data: RevenueCommandData }) {
  return (
    <Workflow title="Record refund or adjustment">
      <form action={createAdjustmentAction} className="grid gap-3">
        <Select name="adjustmentType" label="Type" defaultValue="refund">
          {adjustmentTypes.map((type) => (
            <option key={type} value={type}>
              {labelByValue[type]}
            </option>
          ))}
        </Select>
        <Select name="clientId" label="Client">
          <option value="">No client</option>
          <ClientOptions data={data} />
        </Select>
        <Select name="invoiceId" label="Invoice">
          <option value="">No invoice</option>
          {data.invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.invoiceNumber || invoice.client.businessName}
            </option>
          ))}
        </Select>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="amount" label="Amount" required />
          <Input
            name="effectiveDate"
            label="Effective date"
            type="date"
            defaultValue={dateInputValue(new Date())}
            required
          />
        </div>
        <TextArea name="reason" placeholder="Reason required" />
        <Button type="submit">Record adjustment</Button>
      </form>
    </Workflow>
  );
}

function ClientOptions({ data }: { data: RevenueCommandData }) {
  return (
    <>
      <option value="">Choose client</option>
      {data.clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.businessName}
        </option>
      ))}
    </>
  );
}

function Score({
  label,
  value,
  icon: Icon,
  tone
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "warn";
}) {
  return (
    <div className="rounded-md border border-border bg-surface/76 p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-muted">{label}</p>
        <Icon
          aria-hidden
          className={cn("h-4 w-4 text-primary", tone === "warn" && "text-warning")}
        />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function Metric({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div className="rounded-md border border-border bg-background/35 p-3">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold">
        {value} {caption ? <span className="text-xs text-muted">{caption}</span> : null}
      </p>
    </div>
  );
}

function QuickPanel({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-background/35 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Icon aria-hidden className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Workflow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-md border border-border bg-background/35">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-semibold">
        {title}
        <ArrowUpRight
          aria-hidden
          className="h-4 w-4 text-primary transition group-open:rotate-45"
        />
      </summary>
      <div className="border-t border-border p-3">{children}</div>
    </details>
  );
}

function Panel({ title, empty, children }: { title: string; empty: boolean; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <div className="grid gap-3">
        {empty ? <EmptyMessage text="No records match this section yet." /> : children}
      </div>
    </Card>
  );
}

function Composition({
  title,
  rows
}: {
  title: string;
  rows: Array<{ name: string; amountCents: number }>;
}) {
  const max = Math.max(...rows.map((row) => row.amountCents), 1);
  return (
    <Panel title={title} empty={!rows.length}>
      {rows.map((row) => (
        <div className="grid gap-2" key={row.name}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>{row.name}</span>
            <span className="font-semibold">{formatMoney(row.amountCents)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(row.amountCents / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </Panel>
  );
}

function TextArea({ name, placeholder = "Notes" }: { name: string; placeholder?: string }) {
  return (
    <textarea
      className="min-h-20 rounded-md border border-border bg-surface-raised/80 p-3 text-sm text-foreground outline-none placeholder:text-muted-soft focus:border-primary"
      name={name}
      placeholder={placeholder}
    />
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-background/25 p-4 text-sm text-muted">
      {text}
    </div>
  );
}

function attentionRows(data: RevenueCommandData) {
  return [
    ...data.attention.overdueInvoices.map((invoice) => ({
      key: `overdue-${invoice.id}`,
      title: `Overdue invoice: ${invoice.client.businessName}`,
      description: `${dateInputValue(invoice.dueDate)} due date`,
      amountCents: invoice.amountOutstandingCents
    })),
    ...data.attention.partiallyPaidInvoices.map((invoice) => ({
      key: `partial-${invoice.id}`,
      title: `Partially paid invoice: ${invoice.client.businessName}`,
      description: "Remaining balance needs follow-up.",
      amountCents: invoice.amountOutstandingCents
    })),
    ...data.attention.signedContractsWithoutInvoices.map((contract) => ({
      key: `contract-${contract.id}`,
      title: `Signed contract not invoiced: ${contract.name}`,
      description: contract.client.businessName,
      amountCents: contract.contractedAmountCents
    })),
    ...data.attention.recurringEndingSoon.map((schedule) => ({
      key: `recurring-${schedule.id}`,
      title: `Expected recurring payment: ${schedule.client.businessName}`,
      description: dateInputValue(schedule.nextExpectedDate),
      amountCents: schedule.amountCents
    }))
  ].slice(0, 12);
}
