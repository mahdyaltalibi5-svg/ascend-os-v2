"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createOrganizationSchema } from "@/lib/validation/organization";

type FormValues = z.infer<typeof createOrganizationSchema>;

const timezones = [
  "America/Denver",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "UTC"
];

export function OnboardingForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "Ascend Web Development",
      website: "",
      timezone: "America/Denver",
      logoUrl: "",
      theme: "dark",
      primaryColor: "#3B82F6",
      accentColor: "#38BDF8"
    }
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setMessage(null);

    const response = await fetch("/api/organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(
        error?.message ?? "Unable to create the organization. Check the details and try again."
      );
      setSubmitting(false);
      return;
    }

    router.refresh();
    window.location.assign("/app");
  }

  return (
    <form
      action="/api/organization"
      className="grid gap-4"
      method="post"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <Input label="Organization name" {...form.register("name")} />
      <Input label="Website" placeholder="https://example.com" {...form.register("website")} />
      <Select label="Timezone" {...form.register("timezone")}>
        {timezones.map((timezone) => (
          <option key={timezone} value={timezone}>
            {timezone}
          </option>
        ))}
      </Select>
      <Input label="Logo URL" placeholder="Defer for now" {...form.register("logoUrl")} />
      <Select label="Initial appearance" {...form.register("theme")}>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </Select>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Primary color" type="color" {...form.register("primaryColor")} />
        <Input label="Accent color" type="color" {...form.register("accentColor")} />
      </div>
      {message ? <p className="text-sm text-danger">{message}</p> : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Creating organization" : "Create organization"}
      </Button>
    </form>
  );
}
