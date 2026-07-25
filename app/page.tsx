import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, LogIn, Radar, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div aria-hidden className="ascend-grid absolute inset-0" />
      <div aria-hidden className="ascend-noise absolute inset-0" />
      <section className="relative mx-auto grid min-h-dvh w-full max-w-7xl content-center gap-10 px-4 py-14 sm:px-6 lg:px-8">
        <div className="reveal-up max-w-4xl pt-10">
          <div className="mb-7 inline-flex items-center gap-3 rounded-md border border-border-strong bg-surface/70 px-3 py-2 text-xs font-semibold uppercase text-muted shadow-[inset_0_1px_0_hsl(var(--foreground)/0.08)]">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-[11px] font-black text-white">
              AO
            </span>
            Foundation build
            <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_18px_hsl(var(--success)/0.65)]" />
          </div>
          <p className="text-sm font-semibold text-primary">Ascend operating system</p>
          <h1 className="mt-3 max-w-3xl text-5xl font-semibold tracking-normal text-foreground sm:text-6xl lg:text-7xl">
            Ascend OS
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            A secure command-center foundation for Ascend Web Development: accounts, organizations,
            roles, permissions, audit logging, and honest module shells ready for future milestones.
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

        <div className="reveal-up grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="scan-line rounded-md border border-border-strong bg-surface/80 p-4 shadow-ascend">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-soft">Secure workspace</p>
                <h2 className="mt-1 text-lg font-semibold">Command Center shell</h2>
              </div>
              <Radar aria-hidden className="h-5 w-5 text-primary" />
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {["Revenue", "Sales", "Clients", "Agents"].map((label, index) => (
                <div className="rounded-md border border-border bg-background/40 p-3" key={label}>
                  <div className="mb-8 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">{label}</span>
                    <span className="h-2 w-2 rounded-full bg-primary/70" />
                  </div>
                  <div
                    className="h-1.5 rounded-full bg-primary/70"
                    style={{ width: `${42 + index * 11}%` }}
                  />
                  <p className="mt-3 text-xs leading-5 text-muted-soft">Awaiting module data</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {["Tenant scoped", "Audit ready", "Permission aware"].map((label) => (
                <div
                  className="flex items-center gap-2 rounded-md border border-border bg-surface-raised/60 px-3 py-2 text-xs font-medium text-muted"
                  key={label}
                >
                  <CheckCircle2 aria-hidden className="h-3.5 w-3.5 text-success" />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface/75 p-4 shadow-ascend">
            <div className="flex h-full min-h-64 flex-col justify-between gap-8">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/35 bg-primary/15 text-primary">
                  <LockKeyhole aria-hidden className="h-5 w-5" />
                </div>
                <p className="rounded-sm border border-border bg-background/45 px-2 py-1 text-xs text-muted">
                  Milestone 1
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No fake operations</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  The foundation is live. Revenue, dialer, finance, and agent workflows stay labeled
                  as future modules until real integrations exist.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="reveal-up grid gap-3 md:grid-cols-3">
          {[
            ["Secure foundation", "Authentication, protected routes, and audit-aware mutations."],
            ["Organization tenancy", "Every business-owned surface is scoped to an organization."],
            ["Permission-aware shell", "Founder and Salesperson users see different navigation."]
          ].map(([title, description]) => (
            <div
              key={title}
              className="rounded-md border border-border bg-surface/70 p-5 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)] transition duration-200 hover:border-border-strong hover:bg-surface-raised/80"
            >
              <ShieldCheck aria-hidden className="mb-4 h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
