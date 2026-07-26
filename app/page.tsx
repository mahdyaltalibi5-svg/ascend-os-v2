import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  Fingerprint,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  Workflow
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AscendMark } from "@/components/brand/ascend-mark";

const moduleRows = [
  ["Revenue", "Milestone 2", "Goals, cash, MRR"],
  ["Sales", "Later", "Queues, calls, pipeline"],
  ["Clients", "Later", "Portal and fulfillment"],
  ["Agents", "Later", "Chief of Staff layer"]
];

const foundationItems: Array<[string, string, LucideIcon]> = [
  ["Auth", "Credentials, sessions, protected routes", Fingerprint],
  ["Tenancy", "Organization-scoped records and active org checks", DatabaseZap],
  ["Permissions", "Founder and Salesperson navigation by granular access", ShieldCheck]
];

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div aria-hidden className="ascend-grid absolute inset-0" />
      <div aria-hidden className="ascend-noise absolute inset-0" />

      <section className="relative mx-auto grid min-h-dvh w-full max-w-7xl grid-rows-[auto_1fr_auto] gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <header className="reveal-up flex items-center justify-between gap-4">
          <AscendMark showWordmark />
          <div className="hidden items-center gap-2 md:flex">
            {["Secure", "Tenant-aware", "PWA-ready"].map((item) => (
              <span
                className="rounded-sm border border-border bg-surface/62 px-2.5 py-1 text-xs font-semibold text-muted"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </header>

        <div className="grid content-center gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="reveal-up max-w-3xl">
            <p className="ascend-kicker">Milestone 1 foundation</p>
            <h1 className="mt-5 text-5xl font-semibold leading-[0.9] tracking-normal text-foreground sm:text-6xl lg:text-7xl xl:text-8xl">
              Ascend OS
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
              A secure command-center foundation for Ascend Web Development: accounts,
              organizations, roles, permissions, audit logging, PWA support, and future modules that
              stay honest until real integrations are connected.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_40px_hsl(var(--primary)/0.24)] transition duration-200 hover:bg-primary/90 active:translate-y-px"
                href="/signin"
              >
                <LogIn aria-hidden className="h-4 w-4" />
                Sign in
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-raised/80 px-5 py-2 text-sm font-semibold text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.08)] transition duration-200 hover:border-primary/50 hover:bg-surface-elevated active:translate-y-px"
                href="/signup"
              >
                Create account
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <ProductPreview />
        </div>

        <div className="reveal-up grid gap-3 md:grid-cols-3">
          {foundationItems.map(([title, description, Icon]) => (
            <div
              className="ascend-frame rounded-md border border-border bg-surface/68 p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)] transition duration-200 hover:border-border-strong hover:bg-surface-raised/80"
              key={title}
            >
              <Icon aria-hidden className="mb-5 h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="reveal-up ascend-frame relative">
      <div className="absolute -left-5 top-10 hidden h-32 w-px bg-gradient-to-b from-transparent via-primary/70 to-transparent lg:block" />
      <div className="scan-line overflow-hidden rounded-md border border-border-strong bg-surface/86 shadow-ascend">
        <div className="flex items-center justify-between border-b border-border bg-surface-raised/48 px-4 py-3">
          <AscendMark showWordmark />
          <div className="flex items-center gap-2">
            <span className="hidden rounded-sm border border-border bg-background/42 px-2 py-1 text-xs font-medium text-muted sm:inline-flex">
              Production shell
            </span>
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_18px_hsl(var(--success)/0.7)]" />
          </div>
        </div>

        <div className="grid min-h-[28rem] lg:grid-cols-[14rem_1fr]">
          <aside className="hidden border-r border-border bg-background/30 p-3 lg:block">
            {["Command Center", "Sales", "Revenue", "Clients", "Growth", "Agents"].map(
              (item, index) => (
                <div
                  className={`mb-1 flex min-h-10 items-center gap-3 rounded-md border px-3 text-sm ${
                    index === 0
                      ? "border-border-strong bg-surface-elevated text-foreground"
                      : "border-transparent text-muted"
                  }`}
                  key={item}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      index === 0 ? "bg-primary" : "bg-muted-soft"
                    }`}
                  />
                  {item}
                </div>
              )
            )}
          </aside>

          <div className="ascend-surface-map p-4 sm:p-5">
            <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_16rem]">
              <div>
                <p className="text-sm font-semibold text-primary">Founder Command Center</p>
                <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-normal sm:text-3xl">
                  Foundation online. Live sources pending.
                </h2>
              </div>
              <div className="rounded-md border border-border bg-background/40 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <LockKeyhole aria-hidden className="h-4 w-4 text-primary" />
                  Access posture
                </div>
                <p className="text-xs leading-5 text-muted">
                  Founder permissions visible. Salesperson financial access hidden.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {moduleRows.map(([name, status, detail], index) => (
                <div
                  className="rounded-md border border-border bg-background/46 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]"
                  key={name}
                >
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{name}</p>
                      <p className="mt-1 text-xs text-muted">{detail}</p>
                    </div>
                    <span
                      className={`rounded-sm border px-2 py-1 text-[11px] font-semibold ${
                        index === 0
                          ? "border-primary/35 bg-primary/10 text-primary"
                          : "border-border bg-surface/70 text-muted-soft"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
                    <div
                      className={`h-full rounded-full ${
                        index === 0 ? "bg-primary" : "bg-muted-soft/70"
                      }`}
                      style={{ width: `${28 + index * 13}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_0.85fr]">
              <div className="rounded-md border border-border bg-background/46 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Audit trail</p>
                  <Workflow aria-hidden className="h-4 w-4 text-accent-mint" />
                </div>
                {["Account created", "Organization selected", "Permission checked"].map((item) => (
                  <div
                    className="flex items-center gap-2 border-t border-border py-2 text-xs text-muted first:border-t-0 first:pt-0"
                    key={item}
                  >
                    <CheckCircle2 aria-hidden className="h-3.5 w-3.5 text-success" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="rounded-md border border-border bg-background/46 p-3">
                <p className="text-sm font-semibold">Integration stance</p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Stripe, dialer, banking, ads, and agents are framed as future modules until
                  approved providers and credentials exist.
                </p>
                <div className="mt-4 h-px bg-gradient-to-r from-accent-warm/70 via-border to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
