import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { SigninForm } from "@/components/auth/signin-form";

export default function SigninPage() {
  return (
    <AuthCard title="Sign in to Ascend OS" description="Use your email and password to continue.">
      <Suspense>
        <SigninForm />
      </Suspense>
    </AuthCard>
  );
}
