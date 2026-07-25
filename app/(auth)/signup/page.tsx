import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your Ascend OS account"
      description="Start with secure access, then create or join an organization."
    >
      <SignupForm />
    </AuthCard>
  );
}
