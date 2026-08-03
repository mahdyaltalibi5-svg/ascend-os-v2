"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function SignoutButton() {
  function clearSensitiveLocalState() {
    window.localStorage.removeItem("ascend_pending_call");
    window.localStorage.removeItem("ascend_pending_note");
    window.localStorage.removeItem("ascend_call_session_key");
  }

  return (
    <Link
      className={buttonVariants({ variant: "ghost", size: "sm" })}
      href="/api/auth/signout-audit"
      onClick={clearSensitiveLocalState}
      prefetch={false}
    >
      <LogOut aria-hidden className="h-4 w-4" />
      Sign out
    </Link>
  );
}
