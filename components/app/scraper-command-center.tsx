import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ClipboardCheck,
  Play,
  RefreshCcw,
  SearchCheck,
  Settings2,
  ShieldCheck,
  XCircle
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  approveScraperDiscoveryAction,
  cancelScraperJobAction,
  createScraperJobAction,
  processScraperJobsAction,
  rejectScraperDiscoveryAction,
  retryScraperJobAction,
  updateScraperPolicyAction
} from "@/app/(app)/app/scraper/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { crmTrades, salesLabelByValue, scraperUtahCities } from "@/lib/sales/constants";
import type { ScraperDashboardData } from "@/lib/server/scraper";
import { cn } from "@/lib/utils";

type ScraperCommandCenterProps = {
  data: ScraperDashboardData;
  permissions: string[];
};

export function ScraperCommandCenter({ data, permissions }: ScraperCommandCenterProps) {
  const canManage = permissions.includes("scraper.manage");
  const canApprove = permissions.includes("scraper.approve");
  const canManagePolicy = permissions.includes("scraper.policy.manage");

  return (
    <section className="reveal-up grid gap-6">
      <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold text-primary">Founder scraper</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal text-foreground md:text-5xl">
            Verified Utah lead discovery
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">
            HVAC and plumbing only. Official phone evidence, suppression checks, and human approval
            stand between every discovery and the call queue.
          </p>
        </div>
        <form action={processScraperJobsAction}>
          <Button disabled={!canManage} type="submit" variant="secondary">
            <Play aria-hidden className="h-4 w-4" />
            Run next job
          </Button>
        </form>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric icon={SearchCheck} label="Discovered" value={data.metrics.totalDiscovered} />
        <Metric icon={CheckCircle2} label="Call ready" value={data.metrics.callReady} tone="good" />
        <Metric icon={ClipboardCheck} label="Review" value={data.metrics.needsReview} />
        <Metric icon={ShieldCheck} label="Approved" value={data.metrics.approved} tone="good" />
        <Metric icon={XCircle} label="Rejected" value={data.metrics.rejected} />
        <Metric icon={Ban} label="Suppressed" value={data.metrics.suppressed} tone="danger" />
      </div>

      {!data.providerStatus.googlePlacesConfigured ? (
        <div className="rounded-md border border-warning/45 bg-warning/10 p-4 text-sm leading-6 text-warning">
          Google Places is not configured in this environment, so live scraper jobs are disabled.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid content-start gap-6">
          <LaunchPanel
            canManage={canManage}
            providerReady={data.providerStatus.googlePlacesConfigured}
          />
          <JobsPanel data={data} canManage={canManage} />
          {canManagePolicy ? <PolicyPanel data={data} /> : null}
        </div>
        <ReviewPanel data={data} canApprove={canApprove} />
      </div>
    </section>
  );
}

function LaunchPanel({ canManage, providerReady }: { canManage: boolean; providerReady: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Discovery run</CardTitle>
        <CardDescription>
          Google Places primary discovery for Utah HVAC and plumbing businesses.
        </CardDescription>
      </CardHeader>
      <form action={createScraperJobAction} className="grid gap-4">
        <input name="sourceProvider" type="hidden" value="google_places" />
        <div className="grid gap-3 sm:grid-cols-2">
          {crmTrades.map((trade) => (
            <label
              className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background/35 px-3 text-sm font-semibold text-foreground"
              key={trade}
            >
              <input
                className="h-4 w-4 accent-primary"
                defaultChecked
                name="trades"
                type="checkbox"
                value={trade}
              />
              {trade}
            </label>
          ))}
        </div>
        <div className="grid max-h-72 gap-2 overflow-auto rounded-md border border-border bg-background/30 p-3 sm:grid-cols-2">
          {scraperUtahCities.map((city, index) => (
            <label className="flex items-center gap-2 text-sm text-muted" key={city}>
              <input
                className="h-4 w-4 accent-primary"
                defaultChecked={index < 4}
                name="cities"
                type="checkbox"
                value={city}
              />
              {city}
            </label>
          ))}
        </div>
        <Select defaultValue="4" label="Results per search" name="limitPerSearch">
          {[2, 4, 6, 8, 10].map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </Select>
        <Button disabled={!canManage || !providerReady} type="submit">
          <SearchCheck aria-hidden className="h-4 w-4" />
          Queue discovery
        </Button>
      </form>
    </Card>
  );
}

function JobsPanel({ data, canManage }: { data: ScraperDashboardData; canManage: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Jobs</CardTitle>
        <CardDescription>
          {data.providerStatus.workerSecretConfigured
            ? "Worker endpoint ready."
            : "Worker secret is not configured."}
        </CardDescription>
      </CardHeader>
      <div className="grid gap-3">
        {data.jobs.length ? (
          data.jobs.map((job) => {
            const progress =
              job.progressTotal > 0
                ? Math.round((job.progressCurrent / job.progressTotal) * 100)
                : 0;
            return (
              <div className="rounded-md border border-border bg-background/35 p-3" key={job.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {salesLabelByValue[job.status] ?? job.status}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {job.progressCurrent}/{job.progressTotal} checked
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {["queued", "running", "failed"].includes(job.status) ? (
                      <form action={cancelScraperJobAction}>
                        <input name="jobId" type="hidden" value={job.id} />
                        <Button disabled={!canManage} size="sm" type="submit" variant="ghost">
                          <Ban aria-hidden className="h-4 w-4" />
                          Cancel
                        </Button>
                      </form>
                    ) : null}
                    {["failed", "cancelled"].includes(job.status) ? (
                      <form action={retryScraperJobAction}>
                        <input name="jobId" type="hidden" value={job.id} />
                        <Button disabled={!canManage} size="sm" type="submit" variant="secondary">
                          <RefreshCcw aria-hidden className="h-4 w-4" />
                          Retry
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-elevated">
                  <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
                {job.errorMessage ? (
                  <p className="mt-2 text-xs leading-5 text-danger">{job.errorMessage}</p>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="rounded-md border border-border bg-background/35 p-3 text-sm text-muted">
            No scraper jobs yet.
          </p>
        )}
      </div>
    </Card>
  );
}

function PolicyPanel({ data }: { data: ScraperDashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoring policy</CardTitle>
        <CardDescription>Weights must total 100 before the policy can be saved.</CardDescription>
      </CardHeader>
      <form action={updateScraperPolicyAction} className="grid gap-3 sm:grid-cols-2">
        <Input
          defaultValue={data.policy.ownerReachWeight}
          label="Owner reach"
          max={100}
          min={0}
          name="ownerReachWeight"
          type="number"
        />
        <Input
          defaultValue={data.policy.marketingNeedWeight}
          label="Marketing need"
          max={100}
          min={0}
          name="marketingNeedWeight"
          type="number"
        />
        <Input
          defaultValue={data.policy.dataConfidenceWeight}
          label="Data confidence"
          max={100}
          min={0}
          name="dataConfidenceWeight"
          type="number"
        />
        <Input
          defaultValue={data.policy.minimumConfidence}
          label="Minimum confidence"
          max={95}
          min={40}
          name="minimumConfidence"
          type="number"
        />
        <Button className="sm:col-span-2" type="submit" variant="secondary">
          <Settings2 aria-hidden className="h-4 w-4" />
          Save policy
        </Button>
      </form>
    </Card>
  );
}

function ReviewPanel({ data, canApprove }: { data: ScraperDashboardData; canApprove: boolean }) {
  return (
    <div className="grid content-start gap-4">
      <div>
        <h2 className="text-xl font-semibold">Human review queue</h2>
        <p className="mt-1 text-sm text-muted">
          {data.reviewQueue.length} discoveries awaiting a founder decision.
        </p>
      </div>
      {data.reviewQueue.length ? (
        data.reviewQueue.map((discovery) => (
          <Card
            className={cn(
              "border-border-strong",
              ["suppressed", "source_mismatch", "duplicate"].includes(discovery.status) &&
                "border-danger/60 bg-danger/5"
            )}
            key={discovery.id}
          >
            <div className="grid gap-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{discovery.businessName}</h3>
                    <Badge tone={discovery.status === "call_ready" ? "good" : "neutral"}>
                      {salesLabelByValue[discovery.status] ?? discovery.status}
                    </Badge>
                    {discovery.duplicateWarnings.length ? (
                      <Badge tone="danger">Duplicate warning</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {[discovery.trade, discovery.city, discovery.state, discovery.phone]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <ScorePill label="Owner" value={discovery.ownerReachScore} />
                  <ScorePill label="Need" value={discovery.marketingNeedScore} />
                  <ScorePill label="Data" value={discovery.dataConfidenceScore} />
                  <ScorePill label="Priority" value={discovery.callPriorityScore} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <EvidenceList
                  title="Phone evidence"
                  items={[
                    salesLabelByValue[discovery.phoneVerificationStatus] ??
                      discovery.phoneVerificationStatus,
                    discovery.phoneVerificationSource ?? "No official phone source"
                  ]}
                />
                <EvidenceList
                  title="Owner evidence"
                  items={[
                    salesLabelByValue[discovery.ownerConfidence] ?? discovery.ownerConfidence,
                    discovery.ownerName ?? "No owner name verified",
                    discovery.ownerVerificationSource ?? "No owner evidence URL"
                  ]}
                />
                <EvidenceList title="Marketing signals" items={discovery.marketingNeedReasons} />
                <EvidenceList title="Data confidence" items={discovery.dataConfidenceReasons} />
              </div>

              {discovery.duplicateWarnings.length ? (
                <div className="rounded-md border border-danger/55 bg-danger/10 p-3 text-sm text-danger">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <AlertTriangle aria-hidden className="h-4 w-4" />
                    Duplicate protection
                  </div>
                  {discovery.duplicateWarnings.join(" ")}
                </div>
              ) : null}

              {discovery.weaknesses.length ? (
                <div className="grid gap-2">
                  <p className="text-xs font-semibold uppercase text-muted">Weakness evidence</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {discovery.weaknesses.slice(0, 4).map((weakness) => (
                      <div
                        className="rounded-md border border-border bg-background/35 p-3 text-sm text-muted"
                        key={weakness.id}
                      >
                        <p className="font-semibold text-foreground">
                          {weakness.signal.replace(/_/g, " ")}
                        </p>
                        <p className="mt-1 leading-5">{weakness.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <form
                  action={approveScraperDiscoveryAction}
                  className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                >
                  <input name="discoveryId" type="hidden" value={discovery.id} />
                  <Input
                    defaultValue={discovery.businessName}
                    label="Business"
                    name="businessName"
                  />
                  <Input defaultValue={discovery.ownerName ?? ""} label="Owner" name="ownerName" />
                  <Input defaultValue={discovery.phone ?? ""} label="Phone" name="phone" />
                  <Select
                    defaultValue={discovery.assignedUserId ?? ""}
                    label="Assigned"
                    name="assignedUserId"
                  >
                    <option value="">Unassigned</option>
                    {data.members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.user.name ?? member.user.email}
                      </option>
                    ))}
                  </Select>
                  <input name="websiteUrl" type="hidden" value={discovery.websiteUrl ?? ""} />
                  <input
                    name="googleBusinessProfileUrl"
                    type="hidden"
                    value={discovery.googleBusinessProfileUrl ?? ""}
                  />
                  <Button
                    className="sm:col-span-2 lg:col-span-4"
                    disabled={!canApprove || discovery.status !== "call_ready"}
                    type="submit"
                  >
                    <CheckCircle2 aria-hidden className="h-4 w-4" />
                    Approve to call queue
                  </Button>
                </form>
                <form action={rejectScraperDiscoveryAction} className="grid min-w-64 gap-3">
                  <input name="discoveryId" type="hidden" value={discovery.id} />
                  <Input
                    defaultValue={
                      discovery.status === "source_mismatch" ? "Phone source mismatch" : ""
                    }
                    label="Reject reason"
                    name="rejectionReason"
                  />
                  <Button disabled={!canApprove} type="submit" variant="danger">
                    <XCircle aria-hidden className="h-4 w-4" />
                    Reject
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        ))
      ) : (
        <Card>
          <p className="text-sm text-muted">No discoveries need review.</p>
        </Card>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "neutral"
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: "neutral" | "good" | "danger";
}) {
  return (
    <div className="rounded-md border border-border bg-surface-raised/80 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted">
        <Icon
          aria-hidden
          className={cn(
            "h-4 w-4",
            tone === "good" ? "text-success" : tone === "danger" ? "text-danger" : "text-primary"
          )}
        />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-16 rounded-md border border-border bg-background/35 px-2 py-2">
      <p className="text-[10px] font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "neutral" | "good" | "danger" }) {
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-1 text-xs font-semibold",
        tone === "good"
          ? "border-success/40 bg-success/10 text-success"
          : tone === "danger"
            ? "border-danger/40 bg-danger/10 text-danger"
            : "border-border bg-surface-elevated text-muted"
      )}
    >
      {children}
    </span>
  );
}

function EvidenceList({ title, items }: { title: string; items: string[] }) {
  const filtered = items.filter(Boolean);
  return (
    <div className="rounded-md border border-border bg-background/35 p-3">
      <p className="text-xs font-semibold uppercase text-muted">{title}</p>
      <ul className="mt-2 grid gap-1 text-sm leading-5 text-muted">
        {filtered.length ? (
          filtered.slice(0, 5).map((item) => <li key={item}>{item}</li>)
        ) : (
          <li>No evidence recorded.</li>
        )}
      </ul>
    </div>
  );
}
