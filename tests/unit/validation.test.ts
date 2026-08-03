import { describe, expect, it } from "vitest";

import { registerSchema } from "@/lib/validation/auth";
import { createOrganizationSchema } from "@/lib/validation/organization";
import {
  commandItemIdSchema,
  createGoalSchema,
  createFocusBlockSchema,
  createOperatingNoteSchema,
  createPrioritySchema,
  dailyPlanSchema,
  dailyReviewSchema,
  editPrioritySchema
} from "@/lib/validation/personal-os";
import { leadBusinessSchema } from "@/lib/validation/sales";

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
        description: "Keep it real and database-backed",
        priorityLevel: "critical",
        category: "product",
        timeframe: "today",
        dueDate: "2026-07-28",
        dueTime: "14:30",
        estimatedMinutes: "90",
        estimatedRevenueImpact: "5000"
      }).success
    ).toBe(true);
    expect(
      editPrioritySchema.safeParse({
        id: "clz6x4v2m000008l4e6zafn0a",
        title: "x",
        priorityLevel: "urgent"
      }).success
    ).toBe(false);
  });

  it("validates operating notes and focus blocks", () => {
    expect(
      createOperatingNoteSchema.safeParse({
        title: "Launch note",
        body: "Keep white-label positioning deferred.",
        pinned: true,
        category: "decision",
        tags: ["positioning"]
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

  it("validates goals, daily plans, and daily reviews", () => {
    expect(
      createGoalSchema.safeParse({
        title: "Collect $50,000 this month",
        goalType: "monthly",
        category: "revenue",
        metricType: "currency",
        targetValue: "50000",
        currentValue: "12000",
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        unit: "currency"
      }).success
    ).toBe(true);
    expect(dailyPlanSchema.safeParse({ dailyIntention: "Ship the cockpit" }).success).toBe(true);
    expect(dailyReviewSchema.safeParse({ founderRating: 11 }).success).toBe(false);
  });

  it("requires command item ids to be cuid values", () => {
    expect(commandItemIdSchema.safeParse({ id: "clz6x4v2m000008l4e6zafn0a" }).success).toBe(true);
    expect(commandItemIdSchema.safeParse({ id: "not-a-cuid" }).success).toBe(false);
  });

  it("validates CRM lead phone, trade, and Utah scope", () => {
    const validLead = {
      businessName: "Wasatch Comfort Pros",
      trade: "HVAC",
      primaryPhone: "801-555-0100",
      state: "UT"
    };

    expect(leadBusinessSchema.safeParse(validLead).success).toBe(true);
    expect(leadBusinessSchema.safeParse({ ...validLead, primaryPhone: "abc" }).success).toBe(false);
    expect(leadBusinessSchema.safeParse({ ...validLead, trade: "Roofing" }).success).toBe(false);
    expect(leadBusinessSchema.safeParse({ ...validLead, state: "AZ" }).success).toBe(false);
  });
});
