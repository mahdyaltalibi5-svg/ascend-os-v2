import { prisma } from "@/lib/server/db";
import { calculateSalesMetrics, rankQueue, salesRecommendation } from "@/lib/sales/operations";

export type SalesCommandData = Awaited<ReturnType<typeof getSalesCommandData>>;

export async function getDefaultPipeline(organizationId: string) {
  let pipeline = await prisma.pipeline.findFirst({
    where: { organizationId, isDefault: true, archivedAt: null },
    include: { stages: { orderBy: { sortOrder: "asc" } } }
  });
  if (!pipeline) {
    pipeline = await prisma.pipeline.findFirst({
      where: { organizationId, archivedAt: null },
      include: { stages: { orderBy: { sortOrder: "asc" } } }
    });
  }
  if (!pipeline) throw new Error("PIPELINE_NOT_CONFIGURED");
  return pipeline;
}

export async function getSalesCommandData(input: {
  organizationId: string;
  userId: string;
  permissions: string[];
  timezone: string;
}) {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);
  const canViewAll =
    input.permissions.includes("prospects.view_all") ||
    input.permissions.includes("pipeline.view_all") ||
    input.permissions.includes("sales.reports.view");
  const ownFilter = canViewAll ? {} : { assignedUserId: input.userId };
  const pipeline = await getDefaultPipeline(input.organizationId);

  const [
    campaigns,
    leadBusinesses,
    analyses,
    prospects,
    attempts,
    followUps,
    appointments,
    opportunities,
    salesGoals,
    jobs,
    suppressions,
    members,
    services
  ] = await prisma.$transaction([
    prisma.leadCampaign.findMany({
      where: { organizationId: input.organizationId, archivedAt: null },
      include: { memberships: true, jobs: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      take: 30
    }),
    prisma.leadBusiness.findMany({
      where: { organizationId: input.organizationId, archivedAt: null },
      include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 }, prospects: true },
      orderBy: { updatedAt: "desc" },
      take: 120
    }),
    prisma.leadAnalysis.findMany({
      where: { organizationId: input.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 120
    }),
    prisma.prospect.findMany({
      where: { organizationId: input.organizationId, archivedAt: null, ...ownFilter },
      include: {
        leadBusiness: { include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } } },
        primaryContact: true,
        outreachAttempts: { orderBy: { startedAt: "desc" }, take: 6 },
        followUps: { where: { archivedAt: null }, orderBy: { dueAt: "asc" }, take: 6 },
        appointments: { orderBy: { startAt: "asc" }, take: 4 },
        opportunities: { include: { pipelineStage: true }, orderBy: { updatedAt: "desc" }, take: 4 }
      },
      orderBy: { updatedAt: "desc" },
      take: 150
    }),
    prisma.outreachAttempt.findMany({
      where: {
        organizationId: input.organizationId,
        ...(canViewAll ? {} : { userId: input.userId }),
        startedAt: { gte: dayStart, lte: dayEnd }
      },
      orderBy: { startedAt: "desc" },
      take: 200
    }),
    prisma.followUp.findMany({
      where: {
        organizationId: input.organizationId,
        archivedAt: null,
        ...(canViewAll ? {} : { assignedUserId: input.userId })
      },
      include: { prospect: { include: { leadBusiness: true } } },
      orderBy: { dueAt: "asc" },
      take: 120
    }),
    prisma.appointment.findMany({
      where: {
        organizationId: input.organizationId,
        ...(canViewAll
          ? {}
          : { OR: [{ assignedSetterId: input.userId }, { assignedCloserId: input.userId }] })
      },
      include: { prospect: { include: { leadBusiness: true } }, opportunity: true },
      orderBy: { startAt: "asc" },
      take: 80
    }),
    prisma.opportunity.findMany({
      where: {
        organizationId: input.organizationId,
        archivedAt: null,
        ...(canViewAll ? {} : { assignedCloserId: input.userId })
      },
      include: {
        prospect: { include: { leadBusiness: true } },
        pipelineStage: true,
        serviceOffering: true,
        client: true,
        revenueContracts: true
      },
      orderBy: { updatedAt: "desc" },
      take: 120
    }),
    prisma.salesGoal.findMany({
      where: {
        organizationId: input.organizationId,
        status: "active",
        OR: [{ userId: null }, { userId: input.userId }]
      },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.backgroundJob.findMany({
      where: { organizationId: input.organizationId },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.contactSuppression.findMany({
      where: { organizationId: input.organizationId },
      orderBy: { createdAt: "desc" },
      take: 40
    }),
    prisma.organizationMembership.findMany({
      where: { organizationId: input.organizationId, status: "ACTIVE" },
      include: { user: true, roles: { include: { role: true } } },
      orderBy: { createdAt: "asc" }
    }),
    prisma.serviceOffering.findMany({
      where: { organizationId: input.organizationId, active: true },
      orderBy: { name: "asc" }
    })
  ]);

  const queue = rankQueue(prospects, now).slice(0, 40);
  const metrics = calculateSalesMetrics({ attempts, appointments, opportunities });
  const hotUntouched = prospects.filter((prospect) => {
    const classification = prospect.leadBusiness.analyses[0]?.classification;
    return (classification === "hot" || prospect.priority === "hot") && prospect.attemptCount === 0;
  }).length;
  const overdueFollowUps = followUps.filter(
    (followUp) => followUp.status === "open" && followUp.dueAt < now
  ).length;
  const staleOpportunities = opportunities.filter((opportunity) => {
    if (opportunity.status !== "open") return false;
    const nextAction = opportunity.nextActionAt?.getTime() ?? 0;
    const lastActivity = opportunity.lastActivityAt?.getTime() ?? opportunity.updatedAt.getTime();
    return nextAction < now.getTime() && now.getTime() - lastActivity > 7 * 24 * 60 * 60 * 1000;
  }).length;
  const unassignedProspects = prospects.filter((prospect) => !prospect.assignedUserId).length;

  return {
    now,
    dayStart,
    dayEnd,
    canViewAll,
    pipeline,
    campaigns,
    leadBusinesses,
    analyses,
    prospects,
    queue,
    attempts,
    followUps,
    appointments,
    opportunities,
    salesGoals,
    jobs,
    suppressions,
    members,
    services,
    metrics,
    attention: {
      hotUntouched,
      overdueFollowUps,
      staleOpportunities,
      unassignedProspects,
      queueBelowTarget: queue.length < 25,
      leadsAwaitingResearch: leadBusinesses.filter((lead) => lead.analyses.length === 0).length,
      leadsRequiringReview: analyses.filter(
        (analysis) => analysis.classification === "needs_review"
      ).length
    },
    recommendation: salesRecommendation({
      queueSize: queue.length,
      hotUntouched,
      overdueFollowUps,
      staleOpportunities,
      unassignedProspects
    })
  };
}
