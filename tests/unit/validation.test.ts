import { describe, expect, it } from "vitest";

import { registerSchema } from "@/lib/validation/auth";
import { createOrganizationSchema } from "@/lib/validation/organization";
import {
  commandItemIdSchema,
  createFocusBlockSchema,
  createOperatingNoteSchema,
  createPrioritySchema
} from "@/lib/validation/personal-os";

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

  it("validates personal priority input", () => {
    expect(
      createPrioritySchema.safeParse({
        title: "Ship Personal OS polish",
        notes: "Keep it real and database-backed",
        urgency: "critical"
      }).success
    ).toBe(true);
    expect(createPrioritySchema.safeParse({ title: "x", urgency: "urgent" }).success).toBe(false);
  });

  it("validates operating notes and focus blocks", () => {
    expect(
      createOperatingNoteSchema.safeParse({
        title: "Launch note",
        body: "Keep white-label positioning deferred.",
        pinned: true
      }).success
    ).toBe(true);
    expect(
      createFocusBlockSchema.safeParse({
        title: "Deployment window",
        windowLabel: "Today 2-4 PM",
        intention: "Migrate, deploy, smoke test"
      }).success
    ).toBe(true);
    expect(createOperatingNoteSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("requires command item ids to be cuid values", () => {
    expect(commandItemIdSchema.safeParse({ id: "clz6x4v2m000008l4e6zafn0a" }).success).toBe(true);
    expect(commandItemIdSchema.safeParse({ id: "not-a-cuid" }).success).toBe(false);
  });
});
