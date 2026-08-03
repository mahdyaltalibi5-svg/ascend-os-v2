import { telCallingProvider } from "@/lib/sales/calling-provider";

export type CallDeskLead = {
  id: string;
  businessName: string;
  ownerName: string | null;
  primaryPhone: string | null;
  normalizedPhone: string | null;
  phoneType: string;
  phoneVerificationMethod: string;
  phoneVerificationSource: string | null;
  ownerVerificationSource: string | null;
  trade: string | null;
  city: string | null;
  websiteUrl: string | null;
  googleBusinessProfileUrl: string | null;
  source: string;
  leadScore: number;
  ownerReachScore: number;
  ownerReachScoreReasons: string[];
  bestCallingWindowStart: string | null;
  bestCallingWindowEnd: string | null;
  marketingNeedSignals: string[];
  websiteWeaknesses: string[];
  callReady: boolean;
  doNotCall: boolean;
  wrongNumber: boolean;
  operationalStatus: string;
  assignedUserId: string | null;
  lastContactedAt: Date | null;
  nextFollowUpAt: Date | null;
  notes: string | null;
  createdAt: Date;
  callAttempts: Array<{
    outcome: string;
    contactType: string;
    ownerReached: boolean;
    fullPitchDelivered: boolean;
    interested: boolean;
    appointmentBooked: boolean;
    startedAt: Date;
  }>;
  callbacks: Array<{
    scheduledAt: Date;
    status: string;
  }>;
};

export function telUrl(phone: string | null | undefined) {
  return telCallingProvider.hrefFor(phone);
}

export function callOutcomeFlags(outcome: string, contactType = "unknown") {
  const ownerReached =
    contactType === "owner" ||
    [
      "owner_reached",
      "full_pitch_delivered",
      "interested",
      "callback_requested",
      "appointment_booked"
    ].includes(outcome);
  const fullPitchDelivered = ["full_pitch_delivered", "interested", "appointment_booked"].includes(
    outcome
  );
  return {
    ownerReached,
    fullPitchDelivered,
    interested: ["interested", "callback_requested", "appointment_booked"].includes(outcome),
    callbackRequested: outcome === "callback_requested",
    appointmentBooked: outcome === "appointment_booked"
  };
}

export function operationalStatusForOutcome(outcome: string) {
  const statusByOutcome: Record<string, string> = {
    no_answer: "attempted",
    voicemail: "attempted",
    receptionist: "attempted",
    dispatcher: "attempted",
    employee: "attempted",
    owner_reached: "owner_reached",
    full_pitch_delivered: "owner_reached",
    interested: "interested",
    callback_requested: "interested",
    appointment_booked: "appointment_booked",
    not_interested: "closed_lost",
    wrong_number: "wrong_number",
    disqualified: "disqualified",
    do_not_call: "do_not_call"
  };
  return statusByOutcome[outcome] ?? "attempted";
}

export function pipelineStageForOutcome(outcome: string) {
  const stageByOutcome: Record<string, string> = {
    no_answer: "Attempted",
    voicemail: "Attempted",
    receptionist: "Attempted",
    dispatcher: "Attempted",
    employee: "Attempted",
    owner_reached: "Owner Reached",
    full_pitch_delivered: "Owner Reached",
    interested: "Interested",
    callback_requested: "Interested",
    appointment_booked: "Appointment Booked",
    not_interested: "Closed Lost",
    wrong_number: "Wrong Number",
    disqualified: "Disqualified",
    do_not_call: "Do Not Call"
  };
  return stageByOutcome[outcome] ?? "Attempted";
}

export function ownerReachSignals(lead: {
  phoneType?: string | null;
  ownerName?: string | null;
  ownerVerificationSource?: string | null;
  phoneVerificationSource?: string | null;
  sourceUrls?: string[];
  ownerOperatedLikelihood?: number | null;
  callAttempts?: Array<{
    outcome: string;
    contactType: string;
    ownerReached: boolean;
  }>;
}) {
  let score = 35;
  const reasons: string[] = [];
  const sources = [
    lead.ownerVerificationSource,
    lead.phoneVerificationSource,
    ...(lead.sourceUrls ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (lead.phoneType === "direct_owner") {
    score += 30;
    reasons.push("Verified owner-direct phone evidence.");
  }
  if (lead.phoneType === "owner_operated_main_line") {
    score += 22;
    reasons.push("Owner-operated main line evidence.");
  }
  if (lead.phoneType === "official_company_line") {
    score += 12;
    reasons.push("Official company line verified.");
  }
  if (lead.phoneType === "office_line") {
    score -= 8;
    reasons.push("Office line may route through staff.");
  }
  if (lead.ownerName) {
    score += 10;
    reasons.push("Owner or ask-for name is stored.");
  }
  if (lead.ownerVerificationSource) {
    score += 12;
    reasons.push("Owner evidence URL is stored.");
  }
  if (/owner|family|locally owned|owner-operated|founder/.test(sources)) {
    score += 10;
    reasons.push("Stored evidence suggests owner-operated language.");
  }
  if ((lead.ownerOperatedLikelihood ?? 0) >= 70) {
    score += 8;
    reasons.push("High owner-operated likelihood.");
  }
  const ownerAnswers = lead.callAttempts?.filter((attempt) => attempt.ownerReached).length ?? 0;
  if (ownerAnswers > 0) {
    score += Math.min(20, ownerAnswers * 8);
    reasons.push("Previous calls reached an owner.");
  }
  const gatekeepers =
    lead.callAttempts?.filter((attempt) =>
      ["receptionist", "dispatcher", "employee"].includes(attempt.contactType)
    ).length ?? 0;
  if (gatekeepers > 0) {
    score -= Math.min(18, gatekeepers * 6);
    reasons.push("Previous calls reached staff before the owner.");
  }
  const misses =
    lead.callAttempts?.filter((attempt) => ["no_answer", "voicemail"].includes(attempt.outcome))
      .length ?? 0;
  if (misses >= 3) {
    score -= 14;
    reasons.push("Multiple unanswered attempts.");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons: reasons.length ? reasons.slice(0, 6) : ["No strong owner-reach evidence yet."]
  };
}

export function isWithinWindow(
  lead: Pick<CallDeskLead, "bestCallingWindowStart" | "bestCallingWindowEnd">,
  now = new Date()
) {
  if (!lead.bestCallingWindowStart || !lead.bestCallingWindowEnd) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = minutesFromTime(lead.bestCallingWindowStart);
  const end = minutesFromTime(lead.bestCallingWindowEnd);
  return start !== null && end !== null && minutes >= start && minutes <= end;
}

export function queuePriorityScore(lead: CallDeskLead, now = new Date()) {
  if (!isQueueEligible(lead, now)) return -1;
  const exactDue = lead.callbacks.some(
    (callback) =>
      ["scheduled", "due", "overdue"].includes(callback.status) && callback.scheduledAt <= now
  );
  const overdue = lead.callbacks.some(
    (callback) =>
      ["scheduled", "due", "overdue"].includes(callback.status) &&
      callback.scheduledAt.getTime() < now.getTime() - 5 * 60 * 1000
  );
  const ownerAnswered = lead.callAttempts.some((attempt) => attempt.ownerReached);
  const fullPitch = lead.callAttempts.some((attempt) => attempt.fullPitchDelivered);
  const attempts = lead.callAttempts.length;

  let score = 0;
  if (exactDue) score += 10000;
  if (overdue) score += 9000;
  if (lead.operationalStatus === "interested") score += 8000;
  if (ownerAnswered) score += 7000;
  if (fullPitch) score += 6000;
  score += lead.ownerReachScore * 40;
  if (isWithinWindow(lead, now)) score += 3000;
  score += Math.max(lead.leadScore, lead.marketingNeedSignals.length * 12) * 10;
  score += Math.max(0, 100 - attempts * 12);
  score += Math.max(0, 60 - Math.floor((now.getTime() - lead.createdAt.getTime()) / 86_400_000));
  return score;
}

export function rankCallQueue<T extends CallDeskLead>(leads: T[], now = new Date()) {
  return leads
    .map((lead) => ({ lead, score: queuePriorityScore(lead, now) }))
    .filter((item) => item.score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.lead.callAttempts.length - b.lead.callAttempts.length ||
        a.lead.createdAt.getTime() - b.lead.createdAt.getTime() ||
        a.lead.id.localeCompare(b.lead.id)
    )
    .map((item) => item.lead);
}

export function isQueueEligible(lead: CallDeskLead, now = new Date()) {
  if (!lead.callReady || !lead.normalizedPhone) return false;
  if (lead.doNotCall || lead.wrongNumber) return false;
  if (
    ["do_not_call", "wrong_number", "disqualified", "closed_won", "closed_lost"].includes(
      lead.operationalStatus
    )
  ) {
    return false;
  }
  const futureCallback = lead.callbacks.some(
    (callback) =>
      ["scheduled", "due", "overdue"].includes(callback.status) && callback.scheduledAt > now
  );
  return !futureCallback;
}

function minutesFromTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}
