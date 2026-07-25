import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset password"
      description="Password reset delivery is ready to connect after a production email provider is selected."
    >
      <div className="grid gap-4 text-sm leading-6 text-muted">
        <p>
          For Milestone 1.1, no email provider is configured. Use the seeded development accounts
          locally, or configure email delivery before enabling password reset in production.
        </p>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
          href="/signin"
        >
          Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
