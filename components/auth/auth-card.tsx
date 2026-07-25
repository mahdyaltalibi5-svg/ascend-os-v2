export function AuthCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div aria-hidden className="ascend-grid absolute inset-0" />
      <div aria-hidden className="ascend-noise absolute inset-0" />
      <section className="ascend-panel reveal-up relative w-full max-w-md rounded-md p-6">
        <div className="mb-7">
          <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-md border border-primary/35 bg-primary/15 text-sm font-black text-primary shadow-[inset_0_1px_0_hsl(var(--foreground)/0.08)]">
            AO
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        {children}
      </section>
    </main>
  );
}
