"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerSchema } from "@/lib/validation/auth";

type FormValues = z.infer<typeof registerSchema>;

export function SignupForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: ""
    }
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setMessage(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(error?.message ?? "Unable to create an account with those details.");
      setSubmitting(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false
    });

    if (signInResult?.ok) {
      const sessionReady = await waitForCredentialSession();
      if (!sessionReady) {
        setMessage("Account created. Please sign in to continue.");
        router.push("/signin");
        return;
      }

      window.location.assign("/app/onboarding");
      return;
    }

    setMessage("Account created. Please sign in to continue.");
    router.push("/signin");
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Input label="Name" autoComplete="name" {...form.register("name")} />
      {form.formState.errors.name ? (
        <p className="text-sm text-danger">{form.formState.errors.name.message}</p>
      ) : null}
      <Input label="Email" type="email" autoComplete="email" {...form.register("email")} />
      {form.formState.errors.email ? (
        <p className="text-sm text-danger">{form.formState.errors.email.message}</p>
      ) : null}
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        {...form.register("password")}
      />
      {form.formState.errors.password ? (
        <p className="text-sm text-danger">{form.formState.errors.password.message}</p>
      ) : null}
      {message ? <p className="text-sm text-danger">{message}</p> : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Creating account" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link className="text-primary hover:underline" href="/signin">
          Sign in
        </Link>
      </p>
    </form>
  );
}

async function waitForCredentialSession() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const session = (await fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "same-origin"
    })
      .then((response) => response.json())
      .catch(() => null)) as { user?: unknown } | null;

    if (session?.user) return true;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }

  return false;
}
