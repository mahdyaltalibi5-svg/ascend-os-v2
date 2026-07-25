import { describe, expect, it } from "vitest";

import { registerSchema } from "@/lib/validation/auth";
import { createOrganizationSchema } from "@/lib/validation/organization";

describe("mutation validation", () => {
  it("accepts secure account creation input", () => {
    expect(
      registerSchema.safeParse({
        name: "Test Founder",
        email: "founder@example.com",
        password: "SecurePass123"
      }).success
    ).toBe(true);
  });

  it("rejects weak account creation input", () => {
    expect(
      registerSchema.safeParse({
        name: "T",
        email: "not-email",
        password: "short"
      }).success
    ).toBe(false);
  });

  it("validates organization onboarding input", () => {
    expect(
      createOrganizationSchema.safeParse({
        name: "Ascend Test",
        website: "https://example.com",
        timezone: "America/Denver",
        logoUrl: "",
        theme: "dark",
        primaryColor: "#3B82F6",
        accentColor: "#38BDF8"
      }).success
    ).toBe(true);
  });
});
