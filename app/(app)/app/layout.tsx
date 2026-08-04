import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { getCurrentSession } from "@/lib/server/auth";
import { getOrganizationContext } from "@/lib/server/organization";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const context = await getOrganizationContext(session.user.id);

  if (!context) {
    return children;
  }

  return (
    <AppShell
      organizationName={context.organization.name}
      userName={session.user.name ?? ""}
      userEmail={session.user.email ?? ""}
      permissions={context.permissions}
      roleKeys={context.roleKeys}
    >
      {children}
    </AppShell>
  );
}
