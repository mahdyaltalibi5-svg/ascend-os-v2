"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

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
  roleKeys: string[];
  children: React.ReactNode;
};

export function AppShell({
  organizationName,
  userName,
  userEmail,
  permissions,
  roleKeys,
  children
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleNavigation = appNavigation.filter((item) => canSeeNavItem(permissions, item));
  const roleLabel = roleKeys.includes("founder") ? "CEO" : null;

  const nav = (
    <nav aria-label="Primary" className="grid gap-1">
      {visibleNavigation.map((item) => {
        const active =
          item.href === "/app"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted transition hover:bg-surface-raised/80 hover:text-foreground",
              active && "bg-surface-elevated text-foreground"
            )}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
          >
            <span
              className={cn(
                "absolute left-0 h-5 w-0.5 rounded-full bg-transparent",
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
      <header className="sticky top-0 z-30 border-b border-border bg-background/92 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/72 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">{userName || organizationName}</p>
              {roleLabel ? <RoleBadge label={roleLabel} /> : null}
            </div>
            <p className="truncate text-xs text-muted">{organizationName}</p>
          </div>
          <div className="relative">
            <Button
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setMobileMenuOpen((open) => !open)}
              size="icon"
              variant="secondary"
              type="button"
            >
              {mobileMenuOpen ? (
                <X aria-hidden className="h-5 w-5" />
              ) : (
                <Menu aria-hidden className="h-5 w-5" />
              )}
            </Button>
            {mobileMenuOpen ? (
              <div className="absolute right-0 mt-3 w-[min(84vw,20rem)] rounded-md border border-border bg-surface p-3 shadow-ascend">
                {nav}
                <div className="mt-3 border-t border-border pt-3">
                  <SignoutButton />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="relative lg:grid lg:grid-cols-[15rem_1fr]">
        <aside className="sticky top-0 hidden h-dvh border-r border-border bg-surface/82 p-3 shadow-[inset_-1px_0_0_hsl(var(--foreground)/0.03)] lg:grid lg:grid-rows-[auto_1fr_auto]">
          <div className="mb-4">
            <div className="mb-5 flex items-center gap-3">
              <AscendMark />
              <div className="rounded-sm border border-border bg-background/45 px-2 py-1 text-[11px] font-semibold uppercase text-muted-soft">
                Sales OS
              </div>
            </div>
            <p className="truncate text-sm font-semibold text-foreground">{organizationName}</p>
          </div>
          {nav}
          <div className="border-t border-border pt-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-elevated text-xs font-semibold shadow-[inset_0_1px_0_hsl(var(--foreground)/0.07)]">
                {initials(userName || userEmail)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{userName || "Ascend user"}</p>
                  {roleLabel ? <RoleBadge label={roleLabel} /> : null}
                </div>
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

function RoleBadge({ label }: { label: string }) {
  return (
    <span className="rounded-sm border border-primary/45 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
      {label}
    </span>
  );
}
