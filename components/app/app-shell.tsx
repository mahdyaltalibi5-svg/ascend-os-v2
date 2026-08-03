"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";

import { AscendMark } from "@/components/brand/ascend-mark";
import { SignoutButton } from "@/components/app/signout-button";
import { Button } from "@/components/ui/button";
import { appNavigation, canSeeNavItem } from "@/lib/navigation";
import { cn, initials } from "@/lib/utils";

type AppShellProps = {
  organizationName: string;
  userName: string;
  userEmail: string;
  permissions: string[];
  children: React.ReactNode;
};

export function AppShell({
  organizationName,
  userName,
  userEmail,
  permissions,
  children
}: AppShellProps) {
  const pathname = usePathname();
  const visibleNavigation = appNavigation.filter((item) => canSeeNavItem(permissions, item));

  const nav = (
    <nav aria-label="Primary" className="grid gap-1.5">
      {visibleNavigation.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex min-h-11 items-center gap-3 rounded-md border border-transparent px-3 text-sm font-medium text-muted transition duration-200 hover:border-border hover:bg-surface-raised/70 hover:text-foreground",
              active &&
                "border-border-strong bg-surface-elevated text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.07)]"
            )}
            href={item.href}
          >
            <span
              className={cn(
                "absolute left-0 h-5 w-0.5 rounded-full bg-transparent transition",
                active && "bg-primary"
              )}
            />
            <Icon
              aria-hidden
              className={cn(
                "h-4 w-4 shrink-0 transition",
                active ? "text-primary" : "text-muted-soft group-hover:text-primary"
              )}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div aria-hidden className="ascend-grid absolute inset-0" />
      <div aria-hidden className="ascend-noise absolute inset-0" />
      <header className="sticky top-0 z-30 border-b border-border bg-background/92 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/72 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{organizationName}</p>
            <p className="truncate text-xs text-muted">{userEmail}</p>
          </div>
          <details className="relative">
            <summary className="list-none">
              <Button aria-label="Open navigation" size="icon" variant="secondary" type="button">
                <Menu aria-hidden className="h-5 w-5" />
              </Button>
            </summary>
            <div className="ascend-panel absolute right-0 mt-3 w-[min(84vw,22rem)] rounded-md p-3">
              {nav}
              <div className="mt-3 border-t border-border pt-3">
                <SignoutButton />
              </div>
            </div>
          </details>
        </div>
      </header>

      <div className="relative lg:grid lg:grid-cols-[18rem_1fr]">
        <aside className="sticky top-0 hidden h-dvh border-r border-border bg-surface/72 p-4 shadow-[inset_-1px_0_0_hsl(var(--foreground)/0.03)] backdrop-blur lg:grid lg:grid-rows-[auto_1fr_auto]">
          <div className="mb-6">
            <div className="mb-5 flex items-center gap-3">
              <AscendMark />
              <div className="rounded-sm border border-border bg-background/45 px-2 py-1 text-[11px] font-semibold uppercase text-muted-soft">
                Sales OS
              </div>
            </div>
            <p className="truncate text-sm font-semibold text-foreground">{organizationName}</p>
            <p className="truncate text-xs text-muted">{userEmail}</p>
            <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-background/35 px-3 py-2 text-xs text-muted">
              <Sparkles aria-hidden className="h-3.5 w-3.5 text-primary" />
              Command layer active
            </div>
          </div>
          {nav}
          <div className="border-t border-border pt-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-elevated text-xs font-semibold shadow-[inset_0_1px_0_hsl(var(--foreground)/0.07)]">
                {initials(userName || userEmail)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{userName || "Ascend user"}</p>
                <p className="truncate text-xs text-muted">{userEmail}</p>
              </div>
            </div>
            <SignoutButton />
          </div>
        </aside>
        <main className="min-w-0 px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
