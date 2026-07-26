import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import { AscendMark } from "@/components/brand/ascend-mark";
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
    <main className="relative min-h-dvh overflow-hidden bg-background px-4 py-10 text-foreground">
      <div aria-hidden className="ascend-grid absolute inset-0" />
      <div aria-hidden className="ascend-noise absolute inset-0" />
      <section className="reveal-up relative mx-auto grid w-full max-w-4xl gap-6">
        <div>
          <AscendMark className="mb-5" />
          <h1 className="text-4xl font-semibold tracking-normal md:text-5xl">
            Create your organization
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            The first organization establishes tenant boundaries, initial branding, and your Founder
            membership.
          </p>
        </div>
        <Card className="scan-line">
          <CardHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-primary/35 bg-primary/15 text-primary">
              <Building2 aria-hidden className="h-5 w-5" />
            </div>
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
