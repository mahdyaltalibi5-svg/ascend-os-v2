import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-md border border-border bg-surface p-6 shadow-ascend">
        <h1 className="text-2xl font-semibold tracking-normal">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-muted">This Ascend OS page does not exist yet.</p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
          href="/"
        >
          Back to Ascend OS
        </Link>
      </section>
    </main>
  );
}
