import { describe, expect, it } from "vitest";

import {
  callOutcomeFlags,
  isQueueEligible,
  queuePriorityScore,
  rankCallQueue,
  telUrl,
  type CallDeskLead
} from "@/lib/sales/call-desk";
import { telCallingProvider } from "@/lib/sales/calling-provider";

const now = new Date(2026, 7, 3, 10, 0, 0);

describe("call desk queue core", () => {
  it("normalizes tel links through the calling provider abstraction", () => {
    expect(telUrl("(801) 555-0100")).toBe("tel:+18015550100");
    expect(telCallingProvider.canPlaceCallsInBrowser).toBe(false);
  });

  it("ranks exact due callbacks ahead of other eligible leads", () => {
    const ranked = rankCallQueue(
      [
        lead({ id: "high-score", ownerReachScore: 95 }),
        lead({
          id: "due-callback",
          ownerReachScore: 25,
          callbacks: [{ scheduledAt: new Date(now.getTime() - 60_000), status: "scheduled" }]
        }),
        lead({ id: "interested", ownerReachScore: 55, operationalStatus: "interested" })
      ],
      now
    );

    expect(ranked.map((item) => item.id)).toEqual(["due-callback", "interested", "high-score"]);
  });

  it("uses best windows, score, attempts, age, and id for deterministic ties", () => {
    const ranked = rankCallQueue(
      [
        lead({ id: "b", createdAt: new Date("2026-07-30T00:00:00.000Z") }),
        lead({ id: "a", createdAt: new Date("2026-07-30T00:00:00.000Z") }),
        lead({ id: "window", bestCallingWindowStart: "09:00", bestCallingWindowEnd: "11:00" })
      ],
      now
    );

    expect(ranked.map((item) => item.id)).toEqual(["window", "a", "b"]);
    expect(queuePriorityScore(ranked[0], now)).toBeGreaterThan(queuePriorityScore(ranked[1], now));
  });

  it("excludes unsafe or incomplete records from the queue", () => {
    expect(isQueueEligible(lead({ callReady: false }), now)).toBe(false);
    expect(isQueueEligible(lead({ normalizedPhone: null }), now)).toBe(false);
    expect(isQueueEligible(lead({ doNotCall: true }), now)).toBe(false);
    expect(isQueueEligible(lead({ wrongNumber: true }), now)).toBe(false);
    expect(isQueueEligible(lead({ operationalStatus: "disqualified" }), now)).toBe(false);
    expect(
      isQueueEligible(
        lead({
          callbacks: [{ scheduledAt: new Date(now.getTime() + 3_600_000), status: "scheduled" }]
        }),
        now
      )
    ).toBe(false);
  });

  it("sets outcome analytics flags without treating a gatekeeper as an owner", () => {
    expect(callOutcomeFlags("appointment_booked", "owner")).toMatchObject({
      ownerReached: true,
      fullPitchDelivered: true,
      interested: true,
      appointmentBooked: true
    });
    expect(callOutcomeFlags("receptionist", "receptionist")).toMatchObject({
      ownerReached: false,
      fullPitchDelivered: false,
      interested: false
    });
  });
});

function lead(overrides: Partial<CallDeskLead> = {}): CallDeskLead {
  return {
    id: "lead",
    businessName: "Wasatch Comfort",
    ownerName: "Jamie",
    primaryPhone: "801-555-0100",
    normalizedPhone: "8015550100",
    phoneType: "official_company_line",
    phoneVerificationMethod: "official_company_website",
    phoneVerificationSource: "https://example.test/contact",
    ownerVerificationSource: null,
    trade: "HVAC",
    city: "Salt Lake City",
    websiteUrl: "https://example.test",
    googleBusinessProfileUrl: null,
    source: "manual",
    leadScore: 70,
    ownerReachScore: 50,
    ownerReachScoreReasons: ["Official company line verified."],
    bestCallingWindowStart: null,
    bestCallingWindowEnd: null,
    marketingNeedSignals: [],
    websiteWeaknesses: [],
    callReady: true,
    doNotCall: false,
    wrongNumber: false,
    operationalStatus: "new",
    assignedUserId: "caller",
    lastContactedAt: null,
    nextFollowUpAt: null,
    notes: null,
    createdAt: new Date("2026-07-29T00:00:00.000Z"),
    callAttempts: [],
    callbacks: [],
    ...overrides
  };
}
