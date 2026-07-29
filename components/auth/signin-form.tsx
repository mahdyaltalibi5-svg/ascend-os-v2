"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInSchema } from "@/lib/validation/auth";

type FormValues = z.infer<typeof signInSchema>;

export function SigninForm() {
  const params = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setMessage(null);

    const health = await fetch("/api/health").catch(() => null);
    if (health && !health.ok) {
      const details = (await health.json().catch(() => null)) as {
        database?: { message?: string };
      } | null;
      setMessage(
        details?.database?.message ??
          "Ascend OS is running, but the database is not connected. Check DATABASE_URL, run migrations, and restart the app."
      );
      setSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
      callbackUrl: params.get("callbackUrl") ?? "/app"
    });

    if (result?.ok) {
      window.location.assign(result.url ?? "/app");
      return;
    }

    setMessage("The email or password is incorrect.");
    setSubmitting(false);
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Input label="Email" type="email" autoComplete="email" {...form.register("email")} />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        {...form.register("password")}
      />
      {message ? <p className="text-sm text-danger">{message}</p> : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Signing in" : "Sign in"}
      </Button>
      <div className="grid gap-2 text-center text-sm text-muted">
        <Link className="text-primary hover:underline" href="/signup">
          Create an account
        </Link>
        <Link className="text-primary hover:underline" href="/forgot-password">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
