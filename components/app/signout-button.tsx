"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function SignoutButton() {
  async function handleSignOut() {
    await fetch("/api/auth/signout-audit", { method: "POST" });
    await signOut({ callbackUrl: "/signin" });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleSignOut}>
      <LogOut aria-hidden className="h-4 w-4" />
      Sign out
    </Button>
  );
}
