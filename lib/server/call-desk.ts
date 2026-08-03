import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";

import { writeAuditEvent } from "@/lib/server/audit";
import { prisma } from "@/lib/server/db";
import { requireOrganizationContext } from "@/lib/server/organization";
import {
  callOutcomeFlags,
  operationalStatusForOutcome,
  ownerReachSignals,
  pipelineStageForOutcome,
  rankCallQueue,
  telUrl,
  type CallDeskLead
} from "@/lib/sales/call-desk";

const LOCK_MS = 12 * 60 * 1000;
const EXCLUDED_OPERATIONAL_STATUSES = [
  "do_not_call",
  "wrong_number",
  "disqualified",
  "closed_won",
  "closed_lost"
];

export type CallDeskContext = Awaited<ReturnType<typeof getCallDeskContext>>;

export async function getCallDeskContext(userId: string) {
  const context = await requireOrganizationContext(userId);
  return {
    userId,
    organizationId: context.organization.id,
    timezone: context.organization.timezone,
    permissions: context.permissions,
    canViewAll:
      context.permissions.includes("leads.view_all") ||
      context.permissions.includes("calls.view_all") ||
      context.permissions.includes("analytics.company"),
    canManageAll:
      context.permissions.includes("leads.edit_all") ||
      context.permissions.includes("callbacks.manage_all") ||
      context.permissions.includes("appointments.manage_all"),
    canAssign: context.permissions.includes("leads.assign"),
    canManageSuppression: context.permissions.includes("suppression.manage"),
    canManageLocks: context.permissions.includes("locks.manage")
  };
}

export async function getCallDeskData(context: CallDeskContext) {
  await recoverStaleLocks(context.organizationId);
  const [pendingSession, queue, callbacks, appointments] = await Promise.all([
    prisma.pendingCallSession.findFirst({
      where: {
        organizationId: context.organizationId,
        callerUserId: context.userId,
        status: "pending"
      },
      include: { leadBusiness: { include: leadIncludes() } },
      orderBy: { startedAt: "desc" }
    }),
    getQueuePreview(context),
    getCallbacks(context),
    getAppointments(context)
  ]);

  return {
    pendingSession: pendingSession
      ? {
          ...pendingSession,
          telUrl: telUrl(pendingSession.leadBusiness.primaryPhone),
          leadBusiness: presentLead(pendingSession.leadBusiness)
        }
      : null,
    queue,
    callbacks,
    appointments
  };
}

export async function getQueuePreview(context: CallDeskContext, now = new Date()) {
  const leads = await getEligibleLeadCandidates(context, now);
  return rankCallQueue(leads.map(presentLead), now).slice(0, 25);
}

export async function acquireNextLead(
  context: CallDeskContext,
  sessionKey: string,
  now = new Date()
) {
  await recoverStaleLocks(context.organizationId, now);
  const existingSession = await prisma.pendingCallSession.findFirst({
    where: {
      organizationId: context.organizationId,
      callerUserId: context.userId,
      sessionKey,
      status: "pending"
    },
    include: { leadBusiness: { include: leadIncludes() } }
  });
  if (existingSession) {
    return {
      lead: presentLead(existingSession.leadBusiness),
      lock: await lockForLead(context.organizationId, existingSession.leadBusinessId),
      pendingSession: existingSession,
      telUrl: telUrl(existingSession.leadBusiness.primaryPhone)
    };
  }

  const candidates = rankCallQueue(
    (await getEligibleLeadCandidates(context, now)).map(presentLead),
    now
  );
  for (const candidate of candidates) {
    const lock = await tryAcquireLock(context, candidate.id, sessionKey, now);
    if (!lock) continue;
    const pendingSession = await prisma.pendingCallSession.upsert({
      where: {
        organizationId_callerUserId_sessionKey: {
          organizationId: context.organizationId,
          callerUserId: context.userId,
          sessionKey
        }
      },
      update: {
        leadBusinessId: candidate.id,
        status: "pending",
        startedAt: now,
        lastSeenAt: now,
        canceledAt: null,
        completedAt: null
      },
      create: {
        organizationId: context.organizationId,
        callerUserId: context.userId,
        leadBusinessId: candidate.id,
        sessionKey,
        startedAt: now,
        lastSeenAt: now
      }
    });
    return { lead: candidate, lock, pendingSession, telUrl: telUrl(candidate.primaryPhone) };
  }

  return null;
}

export async function startPendingCall(
  context: CallDeskContext,
  input: { leadBusinessId: string; sessionKey: string },
  now = new Date()
) {
  await assertLeadAccess(context, input.leadBusinessId);
  const lock = await tryAcquireLock(context, input.leadBusinessId, input.sessionKey, now);
  if (!lock) throw new Error("LEAD_ALREADY_LOCKED");
  const pendingSession = await prisma.pendingCallSession.upsert({
    where: {
      organizationId_callerUserId_sessionKey: {
        organizationId: context.organizationId,
        callerUserId: context.userId,
        sessionKey: input.sessionKey
      }
    },
    update: {
      leadBusinessId: input.leadBusinessId,
      status: "pending",
      startedAt: now,
      lastSeenAt: now,
      canceledAt: null,
      completedAt: null
    },
    create: {
      organizationId: context.organizationId,
      callerUserId: context.userId,
      leadBusinessId: input.leadBusinessId,
      sessionKey: input.sessionKey,
      startedAt: now,
      lastSeenAt: now
    }
  });
  await audit(context, "sales.call_session.started", "PendingCallSession", pendingSession.id, {
    leadBusinessId: input.leadBusinessId
  });
  return pendingSession;
}

export async function cancelPendingCall(
  context: CallDeskContext,
  input: { pendingSessionId: string; reason?: string | null }
) {
  const session = await prisma.pendingCallSession.findFirstOrThrow({
    where: {
      id: input.pendingSessionId,
      organizationId: context.organizationId,
      callerUserId: context.userId
    }
  });
  await prisma.$transaction([
    prisma.pendingCallSession.update({
      where: { id: session.id },
      data: { status: "canceled", canceledAt: new Date() }
    }),
    prisma.leadLock.updateMany({
      where: {
        organizationId: context.organizationId,
        leadBusinessId: session.leadBusinessId,
        lockedByUserId: context.userId,
        releasedAt: null
      },
      data: { releasedAt: new Date(), releaseReason: input.reason || "caller_cancelled" }
    })
  ]);
  await audit(context, "sales.call_session.canceled", "PendingCallSession", session.id, {
    reason: input.reason
  });
}

export async function recordCallOutcome(
  context: CallDeskContext,
  input: {
    leadBusinessId: string;
    sessionKey?: string | null;
    pendingSessionId?: string | null;
    lockId?: string | null;
    idempotencyKey: string;
    startedAt?: string | null;
    endedAt?: string | null;
    durationSeconds?: number | "" | null;
    outcome: string;
    contactType: string;
    notes?: string | null;
    callbackAt?: string | null;
    callbackReason?: string | null;
    appointmentStartAt?: string | null;
    appointmentEndAt?: string | null;
    appointmentMeetingType?: string | null;
    appointmentNotes?: string | null;
    assignedCloserId?: string | null;
  }
) {
  await assertLeadAccess(context, input.leadBusinessId);
  const lead = await prisma.leadBusiness.findFirstOrThrow({
    where: { id: input.leadBusinessId, organizationId: context.organizationId },
    include: { prospects: { where: { archivedAt: null }, take: 1 } }
  });
  if (lead.doNotCall || lead.wrongNumber) throw new Error("SUPPRESSED_LEAD");
  if (input.outcome === "callback_requested" && !input.callbackAt) {
    throw new Error("INVALID_CALLBACK_TIME");
  }
  if (
    input.outcome === "appointment_booked" &&
    (!input.appointmentStartAt || !input.appointmentEndAt)
  ) {
    throw new Error("INVALID_APPOINTMENT_RANGE");
  }
  const startedAt = input.startedAt ? new Date(input.startedAt) : new Date();
  const endedAt = input.endedAt ? new Date(input.endedAt) : new Date();
  const flags = callOutcomeFlags(input.outcome, input.contactType);
  const nextStatus = operationalStatusForOutcome(input.outcome);
  const nextStage = pipelineStageForOutcome(input.outcome);
  const durationSeconds =
    typeof input.durationSeconds === "number"
      ? input.durationSeconds
      : Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.callAttempt.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: context.organizationId,
          idempotencyKey: input.idempotencyKey
        }
      }
    });
    if (existing) return { attempt: existing, duplicated: true };

    const attempt = await tx.callAttempt.create({
      data: {
        organizationId: context.organizationId,
        leadBusinessId: lead.id,
        callerUserId: context.userId,
        pendingSessionId: input.pendingSessionId || null,
        idempotencyKey: input.idempotencyKey,
        startedAt,
        endedAt,
        durationSeconds,
        outcome: input.outcome,
        contactType: input.contactType,
        ...flags,
        notes: input.notes || null,
        previousPipelineStage: lead.operationalStatus,
        newPipelineStage: nextStage,
        nextAction: nextActionForOutcome(input.outcome, input.callbackAt, input.appointmentStartAt)
      }
    });

    await tx.leadBusiness.update({
      where: { id: lead.id },
      data: {
        operationalStatus: nextStatus,
        lastContactedAt: endedAt,
        nextFollowUpAt: input.callbackAt ? new Date(input.callbackAt) : null,
        wrongNumber: input.outcome === "wrong_number",
        doNotCall: input.outcome === "do_not_call" ? true : lead.doNotCall,
        callReady: ["wrong_number", "do_not_call", "disqualified"].includes(input.outcome)
          ? false
          : lead.callReady
      }
    });

    const prospect =
      lead.prospects[0] ??
      (await tx.prospect.create({
        data: {
          organizationId: context.organizationId,
          leadBusinessId: lead.id,
          assignedUserId: lead.assignedUserId || context.userId,
          status: "new",
          priority: lead.leadScore >= 75 ? "hot" : "standard",
          leadSource: lead.source
        }
      }));

    if (prospect) {
      await tx.prospect.update({
        where: { id: prospect.id },
        data: {
          status: prospectStatusForOutcome(input.outcome),
          lastContactAt: endedAt,
          nextActionAt: input.callbackAt ? new Date(input.callbackAt) : null,
          nextActionType: input.callbackAt ? "call" : null,
          attemptCount: { increment: 1 },
          noAnswerCount: input.outcome === "no_answer" ? { increment: 1 } : undefined,
          conversationCount: flags.ownerReached ? { increment: 1 } : undefined
        }
      });
      await tx.outreachAttempt.create({
        data: {
          organizationId: context.organizationId,
          prospectId: prospect.id,
          userId: context.userId,
          channel: "phone",
          direction: "outbound",
          startedAt,
          completedAt: endedAt,
          durationSeconds,
          outcome: legacyOutcome(input.outcome),
          notes: input.notes || null
        }
      });
    }

    if (input.callbackAt) {
      await tx.salesCallback.create({
        data: {
          organizationId: context.organizationId,
          leadBusinessId: lead.id,
          assignedCallerId: lead.assignedUserId || context.userId,
          scheduledAt: new Date(input.callbackAt),
          timezone: context.timezone,
          reason: input.callbackReason || "Callback requested",
          notes: input.notes || null,
          linkedCallAttemptId: attempt.id,
          createdById: context.userId
        }
      });
    }

    await tx.salesCallback.updateMany({
      where: {
        organizationId: context.organizationId,
        leadBusinessId: lead.id,
        assignedCallerId: context.userId,
        status: { in: ["scheduled", "due", "overdue"] },
        scheduledAt: { lte: endedAt }
      },
      data: {
        status: "completed",
        completedAt: endedAt,
        linkedCallAttemptId: attempt.id
      }
    });

    if (input.appointmentStartAt && input.appointmentEndAt) {
      const startAt = new Date(input.appointmentStartAt);
      const endAt = new Date(input.appointmentEndAt);
      if (endAt <= startAt) throw new Error("INVALID_APPOINTMENT_RANGE");
      await tx.appointment.create({
        data: {
          organizationId: context.organizationId,
          prospectId: prospect.id,
          assignedSetterId: context.userId,
          assignedCloserId: input.assignedCloserId || context.userId,
          title: `${lead.businessName} appointment`,
          startAt,
          endAt,
          timezone: context.timezone,
          status: "scheduled",
          meetingType: input.appointmentMeetingType || "phone",
          notes: input.appointmentNotes || input.notes || null,
          bookingSource: "call_desk"
        }
      });
    }

    if (["wrong_number", "do_not_call"].includes(input.outcome) && lead.normalizedPhone) {
      await tx.contactSuppression.upsert({
        where: {
          organizationId_phone_channel: {
            organizationId: context.organizationId,
            phone: lead.normalizedPhone,
            channel: "phone"
          }
        },
        update: {
          reason: input.outcome === "wrong_number" ? "wrong_person" : "do_not_call",
          permanent: true,
          expiresAt: null
        },
        create: {
          organizationId: context.organizationId,
          leadBusinessId: lead.id,
          businessName: lead.businessName,
          normalizedBusinessName: lead.normalizedBusinessName,
          phone: lead.normalizedPhone,
          channel: "phone",
          reason: input.outcome === "wrong_number" ? "wrong_person" : "do_not_call",
          source: "call_desk",
          permanent: true,
          createdById: context.userId
        }
      });
    }

    if (input.pendingSessionId) {
      await tx.pendingCallSession.updateMany({
        where: {
          id: input.pendingSessionId,
          organizationId: context.organizationId,
          callerUserId: context.userId
        },
        data: { status: "completed", completedAt: endedAt }
      });
    }
    await tx.leadLock.updateMany({
      where: {
        organizationId: context.organizationId,
        leadBusinessId: lead.id,
        lockedByUserId: context.userId,
        releasedAt: null
      },
      data: { releasedAt: endedAt, releaseReason: "outcome_submitted" }
    });

    return { attempt, duplicated: false };
  });

  if (!result.duplicated) {
    await audit(context, "sales.call_attempt.created", "CallAttempt", result.attempt.id, {
      leadBusinessId: lead.id,
      outcome: input.outcome
    });
    if (["wrong_number", "do_not_call"].includes(input.outcome)) {
      await audit(
        context,
        input.outcome === "wrong_number"
          ? "sales.wrong_number.changed"
          : "sales.do_not_call.changed",
        "LeadBusiness",
        lead.id,
        { previousValue: false, newValue: true, reason: input.outcome }
      );
    }
  }

  return result.attempt;
}

export async function createCallback(
  context: CallDeskContext,
  input: {
    leadBusinessId: string;
    assignedCallerId: string;
    scheduledAt: string;
    timezone: string;
    reason: string;
    notes?: string | null;
  }
) {
  await assertLeadAccess(context, input.leadBusinessId);
  if (!context.canManageAll && input.assignedCallerId !== context.userId)
    throw new Error("FORBIDDEN");
  const lead = await prisma.leadBusiness.findFirstOrThrow({
    where: { id: input.leadBusinessId, organizationId: context.organizationId }
  });
  if (lead.doNotCall || lead.wrongNumber) throw new Error("SUPPRESSED_LEAD");
  const callback = await prisma.salesCallback.create({
    data: {
      organizationId: context.organizationId,
      leadBusinessId: lead.id,
      assignedCallerId: input.assignedCallerId,
      scheduledAt: new Date(input.scheduledAt),
      timezone: input.timezone,
      reason: input.reason,
      notes: input.notes || null,
      createdById: context.userId
    }
  });
  await prisma.leadBusiness.update({
    where: { id: lead.id },
    data: { nextFollowUpAt: callback.scheduledAt }
  });
  await audit(context, "sales.callback.created", "SalesCallback", callback.id, {
    leadBusinessId: lead.id
  });
  return callback;
}

export async function updateCallback(
  context: CallDeskContext,
  input: {
    callbackId: string;
    scheduledAt?: string | null;
    status?: string | null;
    notes?: string | null;
    reason?: string | null;
  }
) {
  const callback = await prisma.salesCallback.findFirstOrThrow({
    where: { id: input.callbackId, organizationId: context.organizationId },
    include: { leadBusiness: true }
  });
  if (!context.canManageAll && callback.assignedCallerId !== context.userId)
    throw new Error("FORBIDDEN");
  const nextStatus = input.status ?? callback.status;
  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    let linkedCallAttemptId = callback.linkedCallAttemptId;
    if (nextStatus === "completed" && callback.status !== "completed" && !linkedCallAttemptId) {
      const attempt = await tx.callAttempt.upsert({
        where: {
          organizationId_idempotencyKey: {
            organizationId: context.organizationId,
            idempotencyKey: `callback:${callback.id}:completed`
          }
        },
        update: {},
        create: {
          organizationId: context.organizationId,
          leadBusinessId: callback.leadBusinessId,
          callerUserId: context.userId,
          idempotencyKey: `callback:${callback.id}:completed`,
          startedAt: now,
          endedAt: now,
          durationSeconds: 0,
          outcome: "callback_completed",
          contactType: "unknown",
          previousPipelineStage: callback.leadBusiness.operationalStatus,
          newPipelineStage: callback.leadBusiness.operationalStatus,
          nextAction: "Callback completed"
        }
      });
      linkedCallAttemptId = attempt.id;
      await tx.leadBusiness.update({
        where: { id: callback.leadBusinessId },
        data: { lastContactedAt: now }
      });
    }

    return tx.salesCallback.update({
      where: { id: callback.id },
      data: {
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : callback.scheduledAt,
        status: nextStatus,
        notes: input.notes || callback.notes,
        linkedCallAttemptId,
        completedAt: nextStatus === "completed" ? now : callback.completedAt,
        canceledAt: nextStatus === "canceled" ? now : callback.canceledAt
      }
    });
  });
  await audit(context, `sales.callback.${nextStatus}`, "SalesCallback", callback.id, {
    previousValue: callback.status,
    newValue: nextStatus,
    reason: input.reason
  });
  return updated;
}

export async function releaseLeadLock(
  context: CallDeskContext,
  lockId: string,
  reason?: string | null
) {
  const lock = await prisma.leadLock.findFirstOrThrow({
    where: { id: lockId, organizationId: context.organizationId }
  });
  if (!context.canManageLocks && lock.lockedByUserId !== context.userId)
    throw new Error("FORBIDDEN");
  await prisma.leadLock.update({
    where: { id: lock.id },
    data: { releasedAt: new Date(), releaseReason: reason || "manual_release" }
  });
  await audit(context, "sales.lead_lock.released", "LeadLock", lock.id, {
    leadBusinessId: lock.leadBusinessId,
    reason
  });
}

export async function reviewOwnerReachScore(
  context: CallDeskContext,
  input: {
    leadBusinessId: string;
    ownerReachScore: number;
    ownerReachScoreReasons: string;
    reason: string;
  }
) {
  if (!context.permissions.includes("owner_reach.review")) throw new Error("FORBIDDEN");
  const lead = await prisma.leadBusiness.findFirstOrThrow({
    where: { id: input.leadBusinessId, organizationId: context.organizationId }
  });
  const reasons = input.ownerReachScoreReasons
    .split(/\r?\n/)
    .map((reason) => reason.trim())
    .filter(Boolean)
    .slice(0, 8);
  const review = await prisma.$transaction(async (tx) => {
    await tx.leadBusiness.update({
      where: { id: lead.id },
      data: { ownerReachScore: input.ownerReachScore, ownerReachScoreReasons: reasons }
    });
    return tx.ownerReachScoreReview.create({
      data: {
        organizationId: context.organizationId,
        leadBusinessId: lead.id,
        reviewedById: context.userId,
        previousScore: lead.ownerReachScore,
        newScore: input.ownerReachScore,
        previousReasons: lead.ownerReachScoreReasons,
        newReasons: reasons,
        reason: input.reason
      }
    });
  });
  await audit(context, "sales.owner_reach.reviewed", "OwnerReachScoreReview", review.id, {
    leadBusinessId: lead.id
  });
  return review;
}

export async function getCallbacks(context: CallDeskContext) {
  const now = new Date();
  const callbacks = await prisma.salesCallback.findMany({
    where: {
      organizationId: context.organizationId,
      ...(context.canViewAll ? {} : { assignedCallerId: context.userId })
    },
    include: { leadBusiness: true, assignedCaller: true },
    orderBy: { scheduledAt: "asc" },
    take: 200
  });
  return callbacks.map((callback) => ({
    ...callback,
    effectiveStatus: callbackStatus(callback.status, callback.scheduledAt, now)
  }));
}

export async function getAppointments(context: CallDeskContext) {
  return prisma.appointment.findMany({
    where: {
      organizationId: context.organizationId,
      ...(context.canViewAll
        ? {}
        : { OR: [{ assignedSetterId: context.userId }, { assignedCloserId: context.userId }] })
    },
    include: { prospect: { include: { leadBusiness: true } } },
    orderBy: { startAt: "asc" },
    take: 200
  });
}

export async function getCalendarData(context: CallDeskContext) {
  const [appointments, callbacks, followUps] = await Promise.all([
    getAppointments(context),
    getCallbacks(context),
    prisma.followUp.findMany({
      where: {
        organizationId: context.organizationId,
        archivedAt: null,
        ...(context.canViewAll ? {} : { assignedUserId: context.userId })
      },
      include: { prospect: { include: { leadBusiness: true } } },
      orderBy: { dueAt: "asc" },
      take: 200
    })
  ]);
  return { appointments, callbacks, followUps };
}

export async function getFounderDashboardData(
  context: CallDeskContext,
  range?: { from: Date; to: Date }
) {
  if (!context.permissions.includes("analytics.company")) throw new Error("FORBIDDEN");
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const from = range?.from ?? dayStart;
  const to = range?.to ?? now;
  const [calls, leads, callbacks, appointments, locks, suppressions, members] = await Promise.all([
    prisma.callAttempt.findMany({
      where: { organizationId: context.organizationId, startedAt: { gte: from, lte: to } },
      include: { leadBusiness: true, caller: true },
      orderBy: { startedAt: "desc" }
    }),
    prisma.leadBusiness.findMany({
      where: { organizationId: context.organizationId, archivedAt: null },
      include: { callAttempts: { orderBy: { startedAt: "desc" }, take: 8 } }
    }),
    getCallbacks(context),
    getAppointments(context),
    prisma.leadLock.findMany({
      where: { organizationId: context.organizationId, releasedAt: null },
      include: { leadBusiness: true, lockedBy: true },
      orderBy: { expiresAt: "asc" }
    }),
    prisma.contactSuppression.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { createdAt: "desc" },
      take: 40
    }),
    prisma.organizationMembership.findMany({
      where: { organizationId: context.organizationId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    })
  ]);
  return {
    calls,
    leads,
    callbacks,
    appointments,
    locks,
    suppressions,
    members,
    metrics: callMetrics(calls),
    team: members.map((member) => ({
      userId: member.userId,
      name: member.user.name ?? member.user.email,
      calls: calls.filter((call) => call.callerUserId === member.userId).length,
      ownersReached: calls.filter(
        (call) => call.callerUserId === member.userId && call.ownerReached
      ).length,
      meetingsBooked: calls.filter(
        (call) => call.callerUserId === member.userId && call.appointmentBooked
      ).length,
      overdueCallbacks: callbacks.filter(
        (callback) =>
          callback.assignedCallerId === member.userId && callback.effectiveStatus === "overdue"
      ).length,
      queueRemaining: leads.filter(
        (lead) => lead.assignedUserId === member.userId && lead.callReady && !lead.doNotCall
      ).length
    }))
  };
}

export async function getSalesDashboardData(context: CallDeskContext) {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(dayStart);
  weekStart.setDate(dayStart.getDate() - 6);
  const [calls, weeklyCalls, queue, callbacks, appointments] = await Promise.all([
    prisma.callAttempt.findMany({
      where: {
        organizationId: context.organizationId,
        callerUserId: context.userId,
        startedAt: { gte: dayStart }
      },
      include: { leadBusiness: true },
      orderBy: { startedAt: "desc" }
    }),
    prisma.callAttempt.findMany({
      where: {
        organizationId: context.organizationId,
        callerUserId: context.userId,
        startedAt: { gte: weekStart }
      },
      include: { leadBusiness: true },
      orderBy: { startedAt: "desc" }
    }),
    getQueuePreview(context),
    getCallbacks(context),
    getAppointments(context)
  ]);
  return {
    calls,
    weeklyCalls,
    queue,
    callbacks,
    appointments,
    metrics: callMetrics(calls),
    dailyCallTarget: 80,
    bookingTarget: 2
  };
}

export async function savePushSubscription(
  context: CallDeskContext,
  input: {
    endpoint: string;
    p256dh?: string | null;
    auth?: string | null;
    userAgent?: string | null;
    enabled: boolean;
  }
) {
  const endpointHash = createHash("sha256").update(input.endpoint).digest("hex");
  const subscription = await prisma.pushSubscription.upsert({
    where: {
      organizationId_userId_endpointHash: {
        organizationId: context.organizationId,
        userId: context.userId,
        endpointHash
      }
    },
    update: {
      enabled: input.enabled,
      revokedAt: input.enabled ? null : new Date(),
      p256dh: input.p256dh || null,
      auth: input.auth || null,
      userAgent: input.userAgent || null
    },
    create: {
      organizationId: context.organizationId,
      userId: context.userId,
      endpointHash,
      endpoint: input.endpoint,
      p256dh: input.p256dh || null,
      auth: input.auth || null,
      userAgent: input.userAgent || null,
      enabled: input.enabled
    }
  });
  await audit(context, "sales.push_subscription.updated", "PushSubscription", subscription.id, {
    enabled: subscription.enabled
  });
  return subscription;
}

async function getEligibleLeadCandidates(context: CallDeskContext, now: Date) {
  const withinPolicy = await isWithinPermittedCallingHours(
    context.organizationId,
    context.timezone,
    now
  );
  if (!withinPolicy) return [];
  const suppressions = await prisma.contactSuppression.findMany({
    where: {
      organizationId: context.organizationId,
      permanent: true,
      OR: [{ channel: "phone" }, { channel: "all" }]
    },
    select: { phone: true, normalizedBusinessName: true }
  });
  const suppressedPhones = new Set(suppressions.map((item) => item.phone).filter(Boolean));
  const suppressedNames = new Set(
    suppressions.map((item) => item.normalizedBusinessName).filter(Boolean)
  );

  const leads = await prisma.leadBusiness.findMany({
    where: {
      organizationId: context.organizationId,
      archivedAt: null,
      callReady: true,
      doNotCall: false,
      wrongNumber: false,
      normalizedPhone: { not: null },
      operationalStatus: { notIn: EXCLUDED_OPERATIONAL_STATUSES },
      ...(context.canViewAll ? {} : { assignedUserId: context.userId })
    },
    include: leadIncludes(),
    orderBy: [{ ownerReachScore: "desc" }, { leadScore: "desc" }, { createdAt: "asc" }],
    take: 250
  });

  return leads.filter((lead) => {
    if (lead.assignedUserId && lead.assignedUserId !== context.userId) return false;
    if (lead.normalizedPhone && suppressedPhones.has(lead.normalizedPhone)) return false;
    if (suppressedNames.has(lead.normalizedBusinessName)) return false;
    const activeLock = lead.locks.find((lock) => !lock.releasedAt && lock.expiresAt > now);
    if (activeLock && activeLock.lockedByUserId !== context.userId) return false;
    return true;
  });
}

async function isWithinPermittedCallingHours(
  organizationId: string,
  fallbackTimezone: string,
  now: Date
) {
  const policy = await prisma.callingPolicy.findFirst({
    where: { organizationId, active: true },
    orderBy: { createdAt: "desc" }
  });
  if (!policy) return true;
  const local = localTimeParts(now, policy.timezone || fallbackTimezone);
  const window =
    local.weekday === "Sat"
      ? [policy.saturdayStart, policy.saturdayEnd]
      : local.weekday === "Sun"
        ? [policy.sundayStart, policy.sundayEnd]
        : [policy.weekdayStart, policy.weekdayEnd];
  if (!window[0] || !window[1]) return false;
  const start = minutesFromTime(window[0]);
  const end = minutesFromTime(window[1]);
  if (start === null || end === null) return false;
  return local.minutes >= start && local.minutes <= end;
}

async function tryAcquireLock(
  context: CallDeskContext,
  leadBusinessId: string,
  sessionKey: string,
  now: Date
) {
  const expiresAt = new Date(now.getTime() + LOCK_MS);
  try {
    return await prisma.leadLock.create({
      data: {
        organizationId: context.organizationId,
        leadBusinessId,
        lockedByUserId: context.userId,
        sessionKey,
        expiresAt
      }
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }
  const updated = await prisma.leadLock.updateMany({
    where: {
      organizationId: context.organizationId,
      leadBusinessId,
      OR: [{ expiresAt: { lte: now } }, { releasedAt: { not: null } }]
    },
    data: {
      lockedByUserId: context.userId,
      sessionKey,
      createdAt: now,
      expiresAt,
      releasedAt: null,
      releaseReason: null
    }
  });
  return updated.count
    ? await prisma.leadLock.findUnique({
        where: {
          organizationId_leadBusinessId: { organizationId: context.organizationId, leadBusinessId }
        }
      })
    : null;
}

async function recoverStaleLocks(organizationId: string, now = new Date()) {
  await prisma.leadLock.updateMany({
    where: { organizationId, releasedAt: null, expiresAt: { lte: now } },
    data: { releasedAt: now, releaseReason: "expired" }
  });
}

async function lockForLead(organizationId: string, leadBusinessId: string) {
  return prisma.leadLock.findUnique({
    where: { organizationId_leadBusinessId: { organizationId, leadBusinessId } }
  });
}

async function assertLeadAccess(context: CallDeskContext, leadBusinessId: string) {
  const lead = await prisma.leadBusiness.findFirstOrThrow({
    where: { id: leadBusinessId, organizationId: context.organizationId }
  });
  if (!context.canViewAll && lead.assignedUserId !== context.userId) throw new Error("FORBIDDEN");
  return lead;
}

function leadIncludes() {
  return {
    callAttempts: { orderBy: { startedAt: "desc" as const }, take: 8 },
    callbacks: {
      where: { status: { in: ["scheduled", "due", "overdue"] } },
      orderBy: { scheduledAt: "asc" as const },
      take: 3
    },
    locks: { where: { releasedAt: null }, take: 1 }
  };
}

function presentLead(
  lead: CallDeskLead
): CallDeskLead & { telUrl: string; suggestedOpener: string } {
  const score = lead.ownerReachScore
    ? { score: lead.ownerReachScore, reasons: lead.ownerReachScoreReasons }
    : ownerReachSignals(lead);
  return {
    id: lead.id,
    businessName: lead.businessName,
    ownerName: lead.ownerName,
    primaryPhone: lead.primaryPhone,
    normalizedPhone: lead.normalizedPhone,
    phoneType: lead.phoneType,
    phoneVerificationMethod: lead.phoneVerificationMethod,
    phoneVerificationSource: lead.phoneVerificationSource,
    ownerVerificationSource: lead.ownerVerificationSource,
    trade: lead.trade,
    city: lead.city,
    websiteUrl: lead.websiteUrl,
    googleBusinessProfileUrl: lead.googleBusinessProfileUrl,
    source: lead.source,
    leadScore: lead.leadScore,
    ownerReachScore: score.score,
    ownerReachScoreReasons: score.reasons,
    bestCallingWindowStart: lead.bestCallingWindowStart,
    bestCallingWindowEnd: lead.bestCallingWindowEnd,
    marketingNeedSignals: lead.marketingNeedSignals,
    websiteWeaknesses: lead.websiteWeaknesses,
    callReady: lead.callReady,
    doNotCall: lead.doNotCall,
    wrongNumber: lead.wrongNumber,
    operationalStatus: lead.operationalStatus,
    assignedUserId: lead.assignedUserId,
    lastContactedAt: lead.lastContactedAt,
    nextFollowUpAt: lead.nextFollowUpAt,
    notes: lead.notes,
    createdAt: lead.createdAt,
    callAttempts: lead.callAttempts.map((attempt) => ({
      outcome: attempt.outcome,
      contactType: attempt.contactType,
      ownerReached: attempt.ownerReached,
      fullPitchDelivered: attempt.fullPitchDelivered,
      interested: attempt.interested,
      appointmentBooked: attempt.appointmentBooked,
      startedAt: attempt.startedAt
    })),
    callbacks: lead.callbacks.map((callback) => ({
      scheduledAt: callback.scheduledAt,
      status: callback.status
    })),
    telUrl: telUrl(lead.primaryPhone),
    suggestedOpener: `Hi, is ${lead.ownerName || "the owner"} available? This is Ascend calling about ${lead.trade || "local service"} growth in ${lead.city || "Utah"}.`
  };
}

function callbackStatus(status: string, scheduledAt: Date, now: Date) {
  if (["completed", "canceled", "missed"].includes(status)) return status;
  if (scheduledAt.getTime() < now.getTime() - 5 * 60 * 1000) return "overdue";
  if (scheduledAt <= now) return "due";
  return "scheduled";
}

function nextActionForOutcome(
  outcome: string,
  callbackAt?: string | null,
  appointmentStartAt?: string | null
) {
  if (callbackAt) return `Callback at ${callbackAt}`;
  if (appointmentStartAt) return `Appointment at ${appointmentStartAt}`;
  if (["wrong_number", "do_not_call", "disqualified"].includes(outcome))
    return "Removed from queue";
  return "Load next eligible lead";
}

function prospectStatusForOutcome(outcome: string) {
  if (outcome === "appointment_booked") return "appointment_booked";
  if (
    ["owner_reached", "full_pitch_delivered", "interested", "callback_requested"].includes(outcome)
  ) {
    return "connected";
  }
  if (["not_interested", "disqualified"].includes(outcome)) return "unqualified";
  if (outcome === "do_not_call") return "do_not_contact";
  return "attempting_contact";
}

function legacyOutcome(outcome: string) {
  const mapped: Record<string, string> = {
    receptionist: "gatekeeper",
    dispatcher: "gatekeeper",
    employee: "owner_unavailable",
    owner_reached: "owner_conversation",
    full_pitch_delivered: "full_pitch",
    disqualified: "bad_fit",
    do_not_call: "do_not_contact"
  };
  return mapped[outcome] ?? outcome;
}

function callMetrics(
  calls: Array<{
    outcome: string;
    durationSeconds: number | null;
    ownerReached: boolean;
    fullPitchDelivered: boolean;
    appointmentBooked: boolean;
    contactType: string;
  }>
) {
  const answers = calls.filter(
    (call) => !["no_answer", "voicemail", "callback_completed"].includes(call.outcome)
  ).length;
  const ownersReached = calls.filter((call) => call.ownerReached).length;
  const fullPitches = calls.filter((call) => call.fullPitchDelivered).length;
  const meetingsBooked = calls.filter((call) => call.appointmentBooked).length;
  const receptionist = calls.filter((call) =>
    ["receptionist", "dispatcher"].includes(call.contactType)
  ).length;
  const wrongNumbers = calls.filter((call) => call.outcome === "wrong_number").length;
  const durationTotal = calls.reduce((total, call) => total + (call.durationSeconds ?? 0), 0);
  return {
    dialsToday: calls.length,
    answers,
    ownersReached,
    fullPitches,
    meetingsBooked,
    ownerReachRate: ratio(ownersReached, calls.length),
    dialToBookingRate: ratio(meetingsBooked, calls.length),
    ownerConversationToBookingRate: ratio(meetingsBooked, ownersReached),
    averageCallDuration: calls.length ? Math.round(durationTotal / calls.length) : 0,
    receptionistRate: ratio(receptionist, calls.length),
    wrongNumberRate: ratio(wrongNumbers, calls.length)
  };
}

function ratio(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function localTimeParts(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return {
    weekday: part("weekday"),
    minutes: Number(part("hour")) * 60 + Number(part("minute"))
  };
}

function minutesFromTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

async function audit(
  context: CallDeskContext,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Prisma.InputJsonObject
) {
  await writeAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action,
    entityType,
    entityId,
    metadata
  });
}
