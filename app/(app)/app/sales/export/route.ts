import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/server/auth";
import { requireOrganizationContext } from "@/lib/server/organization";
import { getSalesCommandData } from "@/lib/server/sales";
import { escapeCsvFormula } from "@/lib/sales/normalization";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const context = await requireOrganizationContext(session.user.id);
  const type = new URL(request.url).searchParams.get("type") ?? "prospects";
  const data = await getSalesCommandData({
    organizationId: context.organization.id,
    userId: session.user.id,
    permissions: context.permissions,
    timezone: context.organization.timezone
  });

  const rows = rowsForType(type, data);
  const csv = toCsv(rows);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ascend-sales-${type}.csv"`
    }
  });
}

function rowsForType(type: string, data: Awaited<ReturnType<typeof getSalesCommandData>>) {
  if (type === "leads") {
    return data.leadBusinesses.map((lead) => ({
      businessName: lead.businessName,
      normalizedBusinessName: lead.normalizedBusinessName,
      trade: lead.trade,
      ownerName: lead.ownerName,
      phone: lead.primaryPhone,
      normalizedPhone: lead.normalizedPhone,
      email: lead.email,
      website: lead.websiteUrl,
      googleBusinessProfileUrl: lead.googleBusinessProfileUrl,
      city: lead.city,
      state: lead.state,
      sourceUrls: lead.sourceUrls.join(" "),
      ownerVerificationSource: lead.ownerVerificationSource,
      phoneVerificationSource: lead.phoneVerificationSource,
      phoneVerificationMethod: lead.phoneVerificationMethod,
      phoneType: lead.phoneType,
      leadScore: lead.leadScore,
      assignedUserId: lead.assignedUserId,
      lastContactedAt: lead.lastContactedAt?.toISOString() ?? "",
      nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? "",
      doNotCall: lead.doNotCall,
      callReady: lead.callReady,
      industry: lead.industry,
      classification: lead.analyses[0]?.classification ?? "not_analyzed",
      score: lead.analyses[0]?.overallFitScore ?? ""
    }));
  }
  if (type === "outreach") {
    return data.attempts.map((attempt) => ({
      prospectId: attempt.prospectId,
      userId: attempt.userId,
      channel: attempt.channel,
      outcome: attempt.outcome,
      startedAt: attempt.startedAt.toISOString(),
      durationSeconds: attempt.durationSeconds ?? ""
    }));
  }
  if (type === "followups") {
    return data.followUps.map((followUp) => ({
      businessName: followUp.prospect.leadBusiness.businessName,
      type: followUp.type,
      dueAt: followUp.dueAt.toISOString(),
      status: followUp.status,
      priority: followUp.priority
    }));
  }
  if (type === "appointments") {
    return data.appointments.map((appointment) => ({
      businessName: appointment.prospect.leadBusiness.businessName,
      title: appointment.title,
      startAt: appointment.startAt.toISOString(),
      status: appointment.status,
      meetingType: appointment.meetingType
    }));
  }
  if (type === "opportunities") {
    return data.opportunities.map((opportunity) => ({
      businessName: opportunity.prospect.leadBusiness.businessName,
      name: opportunity.name,
      stage: opportunity.pipelineStage.name,
      status: opportunity.status,
      estimatedValueCents: opportunity.estimatedValueCents,
      weightedValueCents: opportunity.weightedValueCents,
      probabilityPercent: opportunity.probabilityPercent
    }));
  }
  if (type === "performance") {
    return [data.metrics];
  }
  return data.prospects.map((prospect) => ({
    businessName: prospect.leadBusiness.businessName,
    assignedUserId: prospect.assignedUserId,
    status: prospect.status,
    priority: prospect.priority,
    attempts: prospect.attemptCount,
    conversations: prospect.conversationCount,
    estimatedValueCents: prospect.estimatedValueCents ?? "",
    nextActionAt: prospect.nextActionAt?.toISOString() ?? ""
  }));
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = escapeCsvFormula(String(row[header] ?? ""));
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
  ];
  return lines.join("\n");
}
