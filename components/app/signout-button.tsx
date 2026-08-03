import Link from "next/link";
import { LogOut } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function SignoutButton() {
  return (
    <Link
      className={buttonVariants({ variant: "ghost", size: "sm" })}
      href="/api/auth/signout-audit"
      prefetch={false}
    >
      <LogOut aria-hidden className="h-4 w-4" />
      Sign out
    </Link>
  );
}
