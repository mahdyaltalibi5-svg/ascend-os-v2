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
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-md border border-border bg-surface p-6 shadow-ascend">
        <div className="mb-6">
          <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-sm font-bold text-primary">
            AO
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        {children}
      </section>
    </main>
  );
}
