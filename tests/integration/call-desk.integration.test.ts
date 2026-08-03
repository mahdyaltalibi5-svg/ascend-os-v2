import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { normalizeBusinessName, normalizePhone } from "@/lib/sales/normalization";

const testUrl = process.env.TEST_DATABASE_URL;
const runIntegration =
  Boolean(testUrl) && testUrl !== process.env.DATABASE_URL && process.env.NODE_ENV !== "production";

const describeCallDesk = runIntegration ? describe : describe.skip;

describeCallDesk("owner-first call desk database workflows", () => {
  const setup = new PrismaClient({
    datasources: { db: { url: testUrl ?? "postgresql://skip:skip@127.0.0.1:1/skip" } }
  });

  it("locks the next lead, records an appointment outcome idempotently, and releases the lock", async () => {
    process.env.DATABASE_URL = testUrl;
    const { acquireNextLead, recordCallOutcome } = await import("@/lib/server/call-desk");
    const { org, mahdy, logan } = await seedOrg();
    const lead = await seedLead(org.id, "Appointment HVAC", "801-555-1000", logan.id);
    const context = callerContext(org.id, logan.id, false);
    const now = new Date("2026-08-03T16:00:00.000Z");

    const [first, second] = await Promise.all([
      acquireNextLead(context, "logan-race-one", now),
      acquireNextLead(callerContext(org.id, mahdy.id, true), "mahdy-race-two", now)
    ]);

    expect(first?.lead.id).toBe(lead.id);
    expect(second?.lead.id).not.toBe(lead.id);

    const appointmentStart = new Date("2026-08-04T17:00:00.000Z");
    const appointmentEnd = new Date("2026-08-04T17:30:00.000Z");
    const attempt = await recordCallOutcome(context, {
      leadBusinessId: lead.id,
      sessionKey: "logan-race-one",
      pendingSessionId: first?.pendingSession.id,
      idempotencyKey: "appointment-outcome-once",
      startedAt: now.toISOString(),
      endedAt: new Date(now.getTime() + 180_000).toISOString(),
      outcome: "appointment_booked",
      contactType: "owner",
      appointmentStartAt: appointmentStart.toISOString(),
      appointmentEndAt: appointmentEnd.toISOString(),
      appointmentMeetingType: "phone",
      notes: "Owner booked a call."
    });
    const duplicate = await recordCallOutcome(context, {
      leadBusinessId: lead.id,
      sessionKey: "logan-race-one",
      pendingSessionId: first?.pendingSession.id,
      idempotencyKey: "appointment-outcome-once",
      startedAt: now.toISOString(),
      endedAt: new Date(now.getTime() + 180_000).toISOString(),
      outcome: "appointment_booked",
      contactType: "owner",
      appointmentStartAt: appointmentStart.toISOString(),
      appointmentEndAt: appointmentEnd.toISOString()
    });

    expect(duplicate.id).toBe(attempt.id);
    await expect(
      setup.callAttempt.findMany({ where: { organizationId: org.id, leadBusinessId: lead.id } })
    ).resolves.toHaveLength(1);
    await expect(
      setup.appointment.findMany({ where: { organizationId: org.id } })
    ).resolves.toHaveLength(1);
    await expect(
      setup.leadLock.findFirst({ where: { organizationId: org.id, leadBusinessId: lead.id } })
    ).resolves.toMatchObject({ releasedAt: expect.any(Date) });
  });

  it("honors assignment, suppression, calling policy, callback completion, and stale-lock recovery", async () => {
    process.env.DATABASE_URL = testUrl;
    const { acquireNextLead, createCallback, recordCallOutcome, updateCallback } =
      await import("@/lib/server/call-desk");
    const { org, mahdy, logan } = await seedOrg();
    const loganContext = callerContext(org.id, logan.id, false);
    const mahdyContext = callerContext(org.id, mahdy.id, true);
    const now = new Date("2026-08-03T16:00:00.000Z");

    const assigned = await seedLead(org.id, "Assigned Plumbing", "801-555-1100", logan.id);
    const unassigned = await seedLead(org.id, "Unassigned HVAC", "801-555-1102", null);
    const suppressed = await seedLead(org.id, "Suppressed Plumbing", "801-555-1103", logan.id);
    await setup.contactSuppression.create({
      data: {
        organizationId: org.id,
        leadBusinessId: suppressed.id,
        businessName: suppressed.businessName,
        normalizedBusinessName: suppressed.normalizedBusinessName,
        phone: suppressed.normalizedPhone,
        channel: "phone",
        reason: "do_not_call",
        source: "test",
        permanent: true
      }
    });

    await expect(acquireNextLead(loganContext, "logan-assigned", now)).resolves.toMatchObject({
      lead: { id: assigned.id }
    });
    await expect(acquireNextLead(mahdyContext, "mahdy-unassigned", now)).resolves.toMatchObject({
      lead: { id: unassigned.id }
    });

    const closedPolicy = await setup.callingPolicy.create({
      data: {
        organizationId: org.id,
        name: "Closed policy",
        timezone: "America/Denver",
        weekdayStart: "20:00",
        weekdayEnd: "21:00",
        active: true
      }
    });
    await expect(acquireNextLead(loganContext, "logan-after-hours", now)).resolves.toBeNull();
    await setup.callingPolicy.update({ where: { id: closedPolicy.id }, data: { active: false } });

    const callback = await createCallback(loganContext, {
      leadBusinessId: assigned.id,
      assignedCallerId: logan.id,
      scheduledAt: new Date(now.getTime() - 60_000).toISOString(),
      timezone: "America/Denver",
      reason: "Owner requested exact callback"
    });
    const completed = await updateCallback(loganContext, {
      callbackId: callback.id,
      status: "completed"
    });
    expect(completed.linkedCallAttemptId).toBeTruthy();

    const stale = await seedLead(org.id, "Stale Lock HVAC", "801-555-1104", logan.id);
    await setup.leadLock.create({
      data: {
        organizationId: org.id,
        leadBusinessId: stale.id,
        lockedByUserId: mahdy.id,
        sessionKey: "abandoned",
        expiresAt: new Date(now.getTime() - 60_000)
      }
    });
    await expect(acquireNextLead(loganContext, "logan-stale", now)).resolves.toMatchObject({
      lead: { id: stale.id }
    });

    await expect(
      recordCallOutcome(loganContext, {
        leadBusinessId: assigned.id,
        sessionKey: "logan-assigned",
        idempotencyKey: "wrong-number-once",
        startedAt: now.toISOString(),
        endedAt: now.toISOString(),
        outcome: "wrong_number",
        contactType: "unknown"
      })
    ).resolves.toMatchObject({ outcome: "wrong_number" });
    await expect(acquireNextLead(loganContext, "logan-suppressed", now)).resolves.toBeNull();
  });

  async function seedOrg() {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const org = await setup.organization.create({
      data: { name: `Call Desk ${unique}`, slug: `call-desk-${unique}`, timezone: "America/Denver" }
    });
    const mahdy = await setup.user.create({
      data: {
        name: "Mahdy",
        email: `mahdy-${unique}@example.test`,
        normalizedEmail: `mahdy-${unique}@example.test`,
        passwordHash: "test-hash"
      }
    });
    const logan = await setup.user.create({
      data: {
        name: "Logan",
        email: `logan-${unique}@example.test`,
        normalizedEmail: `logan-${unique}@example.test`,
        passwordHash: "test-hash"
      }
    });
    return { org, mahdy, logan };
  }

  async function seedLead(
    organizationId: string,
    businessName: string,
    phone: string,
    assignedUserId: string | null
  ) {
    return setup.leadBusiness.create({
      data: {
        organizationId,
        businessName,
        normalizedBusinessName: normalizeBusinessName(businessName),
        trade: businessName.includes("Plumbing") ? "Plumbing" : "HVAC",
        ownerName: "Jamie Owner",
        primaryPhone: phone,
        normalizedPhone: normalizePhone(phone),
        websiteUrl: "https://example.test",
        city: "Salt Lake City",
        state: "UT",
        source: "manual",
        phoneVerificationMethod: "official_company_website",
        phoneVerificationSource: "https://example.test/contact",
        phoneVerificationDate: new Date("2026-08-03T15:00:00.000Z"),
        phoneType: "official_company_line",
        leadScore: 75,
        ownerReachScore: 70,
        ownerReachScoreReasons: ["Official company line verified."],
        assignedUserId,
        callReady: true,
        callReadyAt: new Date("2026-08-03T15:00:00.000Z")
      }
    });
  }

  function callerContext(organizationId: string, userId: string, canViewAll: boolean) {
    return {
      userId,
      organizationId,
      timezone: "America/Denver",
      permissions: canViewAll
        ? [
            "leads.view_all",
            "calls.view_all",
            "callbacks.manage_all",
            "analytics.company",
            "locks.manage"
          ]
        : ["leads.view_assigned", "calls.create", "callbacks.manage_own", "analytics.personal"],
      canViewAll,
      canManageAll: canViewAll,
      canAssign: canViewAll,
      canManageSuppression: canViewAll,
      canManageLocks: canViewAll
    };
  }
});
