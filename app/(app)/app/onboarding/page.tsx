import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/app/onboarding-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/lib/server/auth";
import { getOrganizationContext } from "@/lib/server/organization";

export default async function OnboardingPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");

  const context = await getOrganizationContext(session.user.id);
  if (context) redirect("/app");

  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground">
      <section className="mx-auto grid w-full max-w-3xl gap-6">
        <div>
          <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-sm font-bold text-primary">
            AO
          </div>
          <h1 className="text-3xl font-semibold tracking-normal">Create your organization</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            The first organization establishes tenant boundaries, initial branding, and your Founder
            membership.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Organization setup</CardTitle>
            <CardDescription>
              Logo upload is modeled as a URL for now. File storage can be added when production
              storage is selected.
            </CardDescription>
          </CardHeader>
          <OnboardingForm />
        </Card>
      </section>
    </main>
  );
}
