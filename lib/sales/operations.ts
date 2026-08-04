type QueueProspect = {
  id: string;
  priority: string;
  status: string;
  attemptCount: number;
  noAnswerCount: number;
  conversationCount: number;
  nextActionAt: Date | null;
  lastContactAt: Date | null;
  estimatedValueCents: number | null;
  createdAt: Date;
  leadBusiness: {
    leadScore: number;
    ownerReachScore: number;
    marketingNeedSignals: string[];
    websiteWeaknesses: string[];
    reviewCount: number | null;
    rating: unknown;
    state: string | null;
    city: string | null;
    normalizedPhone: string | null;
    callReady: boolean;
    doNotCall: boolean;
  };
  leadBusinessId: string;
};

export function isWithinCallingWindow(now: Date) {
  const day = now.getDay();
  const hour = now.getHours();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
}

export function queueRank(prospect: QueueProspect, now = new Date()) {
  if (
    ["do_not_contact", "converted", "lost", "archived", "appointment_booked"].includes(
      prospect.status
    )
  ) {
    return -1;
  }
  if (
    !prospect.leadBusiness.callReady ||
    !prospect.leadBusiness.normalizedPhone ||
    prospect.leadBusiness.doNotCall
  ) {
    return -1;
  }
  if (prospect.noAnswerCount >= 3 && !prospect.nextActionAt) return -1;

  let score = 0;
  const priorityScore: Record<string, number> = {
    critical: 90,
    hot: 75,
    warm: 55,
    standard: 35,
    low: 12
  };
  score += priorityScore[prospect.priority] ?? 25;
  if (prospect.nextActionAt && prospect.nextActionAt <= now) score += 80;
  if (prospect.attemptCount === 0) score += 22;
  if (prospect.conversationCount > 0) score += 16;
  score += Math.round(prospect.leadBusiness.ownerReachScore * 0.35);
  score += Math.round(prospect.leadBusiness.leadScore * 0.22);
  score += Math.min(
    24,
    (prospect.leadBusiness.marketingNeedSignals.length +
      prospect.leadBusiness.websiteWeaknesses.length) *
      6
  );
  if (prospect.estimatedValueCents) score += Math.min(30, prospect.estimatedValueCents / 100000);
  if (prospect.lastContactAt) {
    const daysSince = (now.getTime() - prospect.lastContactAt.getTime()) / 86_400_000;
    score += Math.min(20, Math.max(0, daysSince));
  }
  return Math.round(score);
}

export function rankQueue<T extends QueueProspect>(prospects: T[], now = new Date()) {
  return prospects
    .map((prospect) => ({ prospect, score: queueRank(prospect, now) }))
    .filter((item) => item.score >= 0)
    .sort(
      (a, b) => b.score - a.score || a.prospect.createdAt.getTime() - b.prospect.createdAt.getTime()
    )
    .map((item) => item.prospect);
}

export function prospectStatusAfterOutcome(outcome: string) {
  if (outcome === "appointment_booked") return "appointment_booked";
  if (["owner_conversation", "full_pitch", "interested", "callback_requested"].includes(outcome))
    return "connected";
  if (["not_interested", "bad_fit"].includes(outcome)) return "unqualified";
  if (outcome === "do_not_contact") return "do_not_contact";
  if (outcome === "wrong_number") return "nurture";
  return "attempting_contact";
}

export function followUpForOutcome(outcome: string, startedAt: Date) {
  const hours = 60 * 60 * 1000;
  const days = 24 * hours;
  if (outcome === "voicemail") {
    return {
      type: "call",
      dueAt: new Date(startedAt.getTime() + 2 * days),
      notes: "Voicemail follow-up."
    };
  }
  if (outcome === "callback_requested") {
    return {
      type: "call",
      dueAt: new Date(startedAt.getTime() + 1 * days),
      notes: "Callback requested."
    };
  }
  if (outcome === "interested") {
    return {
      type: "general",
      dueAt: new Date(startedAt.getTime() + 1 * days),
      notes: "Interested prospect follow-up."
    };
  }
  if (outcome === "no_answer") {
    return {
      type: "call",
      dueAt: new Date(startedAt.getTime() + 2 * days),
      notes: "Retry after no answer."
    };
  }
  if (outcome === "appointment_booked") {
    return {
      type: "appointment_confirmation",
      dueAt: new Date(startedAt.getTime() + 12 * hours),
      notes: "Confirm appointment details."
    };
  }
  if (outcome === "wrong_number") {
    return {
      type: "general",
      dueAt: new Date(startedAt.getTime() + 1 * days),
      notes: "Correct phone data before retrying."
    };
  }
  return null;
}

export function weightedValue(estimatedValueCents: number, probabilityPercent: number) {
  return Math.round((estimatedValueCents * probabilityPercent) / 100);
}

export function calculateSalesMetrics(input: {
  attempts: Array<{ channel: string; outcome: string; startedAt: Date; userId: string | null }>;
  appointments: Array<{ status: string; startAt: Date }>;
  opportunities: Array<{
    status: string;
    estimatedValueCents: number;
    wonAt: Date | null;
    lostAt: Date | null;
  }>;
}) {
  const attempts = input.attempts.length;
  const answers = input.attempts.filter(
    (attempt) => !["no_answer", "voicemail", "failed"].includes(attempt.outcome)
  ).length;
  const conversations = input.attempts.filter((attempt) =>
    [
      "owner_conversation",
      "full_pitch",
      "interested",
      "callback_requested",
      "appointment_booked"
    ].includes(attempt.outcome)
  ).length;
  const ownersReached = input.attempts.filter((attempt) =>
    ["owner_conversation", "full_pitch", "interested", "appointment_booked"].includes(
      attempt.outcome
    )
  ).length;
  const fullPitches = input.attempts.filter((attempt) =>
    ["full_pitch", "interested", "appointment_booked"].includes(attempt.outcome)
  ).length;
  const appointmentsBooked = input.attempts.filter(
    (attempt) => attempt.outcome === "appointment_booked"
  ).length;
  const appointmentsHeld = input.appointments.filter(
    (appointment) => appointment.status === "completed"
  ).length;
  const noShows = input.appointments.filter(
    (appointment) => appointment.status === "no_show"
  ).length;
  const wins = input.opportunities.filter((opportunity) => opportunity.status === "won").length;
  const openPipelineCents = input.opportunities
    .filter((opportunity) => opportunity.status === "open")
    .reduce((total, opportunity) => total + opportunity.estimatedValueCents, 0);
  const wonRevenueCents = input.opportunities
    .filter((opportunity) => opportunity.status === "won")
    .reduce((total, opportunity) => total + opportunity.estimatedValueCents, 0);

  return {
    attempts,
    dialsToday: input.attempts.filter((attempt) => attempt.channel === "phone").length,
    answers,
    conversations,
    ownersReached,
    fullPitches,
    conversationRate: ratio(conversations, attempts),
    appointmentsBooked,
    meetingsBooked: appointmentsBooked,
    bookingRate: ratio(appointmentsBooked, conversations),
    appointmentsHeld,
    showRate: ratio(appointmentsHeld, appointmentsHeld + noShows),
    noShowRate: ratio(noShows, appointmentsHeld + noShows),
    opportunitiesCreated: input.opportunities.length,
    wins,
    closeRate: ratio(wins, input.opportunities.length),
    openPipelineCents,
    wonRevenueCents,
    averageDealValueCents: input.opportunities.length
      ? Math.round(
          input.opportunities.reduce(
            (total, opportunity) => total + opportunity.estimatedValueCents,
            0
          ) / input.opportunities.length
        )
      : 0
  };
}

export function salesRecommendation(input: {
  queueSize: number;
  hotUntouched: number;
  overdueFollowUps: number;
  staleOpportunities: number;
  unassignedProspects: number;
}) {
  if (input.overdueFollowUps > 0)
    return `Complete ${input.overdueFollowUps} overdue sales follow-up${input.overdueFollowUps === 1 ? "" : "s"}.`;
  if (input.unassignedProspects > 0)
    return `Assign ${input.unassignedProspects} unowned prospect${input.unassignedProspects === 1 ? "" : "s"}.`;
  if (input.hotUntouched > 0)
    return `Contact ${input.hotUntouched} Hot prospect${input.hotUntouched === 1 ? "" : "s"} with no attempts.`;
  if (input.queueSize < 25) return "Generate or import more qualified local-service leads.";
  if (input.staleOpportunities > 0)
    return `Review ${input.staleOpportunities} stale opportunit${input.staleOpportunities === 1 ? "y" : "ies"}.`;
  return "Keep the queue moving and preserve same-day follow-up discipline.";
}

function ratio(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}
