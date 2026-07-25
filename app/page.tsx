import Link from "next/link";
import { ArrowRight, LogIn, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto grid min-h-dvh w-full max-w-6xl content-center gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-sm font-bold text-primary">
            AO
          </div>
          <p className="text-sm font-medium text-primary">Ascend operating system</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            Ascend OS
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
            A secure command-center foundation for Ascend Web Development: accounts, organizations,
            roles, permissions, audit logging, and honest module shells ready for future milestones.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
              href="/signin"
            >
              <LogIn aria-hidden className="h-4 w-4" />
              Sign in
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/50"
              href="/signup"
            >
              Create account
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Secure foundation", "Authentication, protected routes, and audit-aware mutations."],
            ["Organization tenancy", "Every business-owned surface is scoped to an organization."],
            ["Permission-aware shell", "Founder and Salesperson users see different navigation."]
          ].map(([title, description]) => (
            <div key={title} className="rounded-md border border-border bg-surface p-5">
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
