import { z } from "zod";

import {
  appointmentStatuses,
  callbackStatuses,
  callOutcomes,
  campaignStatuses,
  contactTypes,
  crmTrades,
  followUpTypes,
  leadClassifications,
  meetingTypes,
  opportunityStatuses,
  outreachChannels,
  outreachOutcomes,
  phoneTypes,
  phoneVerificationMethods,
  prospectPriorities,
  prospectStatuses,
  salesGoalMetrics,
  suppressionReasons
} from "@/lib/sales/constants";
import { normalizePhone } from "@/lib/sales/normalization";

const optionalShort = z.string().trim().max(180).optional().or(z.literal(""));
const optionalText = z.string().trim().max(2000).optional().or(z.literal(""));
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dateTimeString = z.string().min(10).max(40);
const moneyString = z.string().trim().max(32).optional().or(z.literal(""));
const requiredPhone = z
  .string()
  .trim()
  .min(7, "Phone number is required.")
  .max(180)
  .refine((value) => Boolean(normalizePhone(value)), "Enter a valid phone number.");
const utState = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => value === "UT", "Milestone 1 only supports Utah leads.");

export const leadCampaignSchema = z.object({
  name: z.string().trim().min(2).max(140),
  industry: z.string().trim().min(2).max(80),
  subIndustry: optionalShort,
  country: z.string().trim().min(2).max(80).default("United States"),
  state: optionalShort,
  metroArea: optionalShort,
  city: optionalShort,
  searchRadiusMiles: z.coerce.number().int().min(1).max(75).optional().or(z.literal("")),
  searchTerms: z.string().trim().min(2).max(500),
  minReviewCount: z.coerce.number().int().min(0).max(5000).optional().or(z.literal("")),
  maxReviewCount: z.coerce.number().int().min(0).max(5000).optional().or(z.literal("")),
  minRating: z.coerce.number().min(0).max(5).optional().or(z.literal("")),
  maxRating: z.coerce.number().min(0).max(5).optional().or(z.literal("")),
  ownerOperatedOnly: z.coerce.boolean().default(false),
  excludeFranchises: z.coerce.boolean().default(true),
  excludeSuppliers: z.coerce.boolean().default(true),
  excludeSchools: z.coerce.boolean().default(true),
  excludeJobListings: z.coerce.boolean().default(true),
  excludeParts: z.coerce.boolean().default(true),
  targetLeadCount: z.coerce.number().int().min(1).max(500),
  status: z.enum(campaignStatuses).default("draft"),
  sourceProvider: z.string().trim().max(80).default("google_places")
});

export const leadBusinessSchema = z.object({
  businessName: z.string().trim().min(2).max(180),
  trade: z.enum(crmTrades).default("HVAC"),
  ownerName: optionalShort,
  primaryPhone: requiredPhone,
  email: z.string().trim().email().optional().or(z.literal("")),
  websiteUrl: optionalShort,
  googleBusinessProfileUrl: optionalShort,
  sourceUrls: optionalText,
  ownerVerificationSource: optionalShort,
  phoneVerificationSource: optionalShort,
  phoneVerificationMethod: z.enum(phoneVerificationMethods).default("unverified"),
  phoneType: z.enum(phoneTypes).default("unknown"),
  assignedUserId: z.string().optional().or(z.literal("")),
  nextFollowUpAt: dateTimeString.optional().or(z.literal("")),
  doNotCall: z.coerce.boolean().default(false),
  callReady: z.coerce.boolean().default(false),
  address: optionalShort,
  city: optionalShort,
  state: utState.default("UT"),
  postalCode: optionalShort,
  country: z.string().trim().max(80).default("United States"),
  industry: optionalShort,
  rating: z.coerce.number().min(0).max(5).optional().or(z.literal("")),
  reviewCount: z.coerce.number().int().min(0).max(100000).optional().or(z.literal("")),
  contactName: optionalShort,
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  notes: optionalText
});

export const leadClassificationSchema = z.object({
  leadBusinessId: z.string().min(1),
  classification: z.enum(leadClassifications)
});

export const prospectConversionSchema = z.object({
  leadBusinessId: z.string().min(1),
  assignedUserId: z.string().optional().or(z.literal("")),
  priority: z.enum(prospectPriorities).default("standard"),
  estimatedValue: moneyString,
  recommendedService: optionalShort,
  firstFollowUpDate: dateString.optional().or(z.literal("")),
  notes: optionalText
});

export const prospectUpdateSchema = z.object({
  prospectId: z.string().min(1),
  assignedUserId: z.string().optional().or(z.literal("")),
  status: z.enum(prospectStatuses),
  priority: z.enum(prospectPriorities),
  nextActionAt: dateTimeString.optional().or(z.literal("")),
  notes: optionalText
});

export const outreachAttemptSchema = z.object({
  prospectId: z.string().min(1),
  contactId: z.string().optional().or(z.literal("")),
  channel: z.enum(outreachChannels),
  direction: z.enum(["outbound", "inbound"]).default("outbound"),
  outcome: z.enum(outreachOutcomes),
  durationSeconds: z.coerce.number().int().min(0).max(14400).optional().or(z.literal("")),
  notes: optionalText,
  createFollowUp: z.coerce.boolean().default(true)
});

export const followUpSchema = z.object({
  prospectId: z.string().min(1),
  assignedUserId: z.string().optional().or(z.literal("")),
  type: z.enum(followUpTypes),
  dueAt: dateTimeString,
  priority: z.enum(prospectPriorities).default("standard"),
  notes: optionalText
});

export const appointmentSchema = z.object({
  prospectId: z.string().min(1),
  contactId: z.string().optional().or(z.literal("")),
  assignedSetterId: z.string().optional().or(z.literal("")),
  assignedCloserId: z.string().optional().or(z.literal("")),
  title: z.string().trim().min(2).max(180),
  startAt: dateTimeString,
  endAt: dateTimeString,
  timezone: z.string().trim().min(2).max(80),
  status: z.enum(appointmentStatuses).default("scheduled"),
  meetingType: z.enum(meetingTypes).default("discovery"),
  meetingUrl: optionalShort,
  location: optionalShort,
  notes: optionalText
});

export const nextLeadSchema = z.object({
  sessionKey: z.string().trim().min(8).max(120)
});

export const pendingCallSessionSchema = z.object({
  leadBusinessId: z.string().min(1),
  sessionKey: z.string().trim().min(8).max(120)
});

export const cancelPendingCallSchema = z.object({
  pendingSessionId: z.string().min(1),
  reason: optionalShort
});

export const callOutcomeSchema = z.object({
  leadBusinessId: z.string().min(1),
  sessionKey: z.string().trim().min(8).max(120),
  pendingSessionId: z.string().optional().or(z.literal("")),
  lockId: z.string().optional().or(z.literal("")),
  idempotencyKey: z.string().trim().min(8).max(120),
  startedAt: dateTimeString.optional().or(z.literal("")),
  endedAt: dateTimeString.optional().or(z.literal("")),
  durationSeconds: z.coerce.number().int().min(0).max(14400).optional().or(z.literal("")),
  outcome: z.enum(callOutcomes),
  contactType: z.enum(contactTypes).default("unknown"),
  notes: optionalText,
  callbackAt: dateTimeString.optional().or(z.literal("")),
  callbackReason: optionalShort,
  appointmentStartAt: dateTimeString.optional().or(z.literal("")),
  appointmentEndAt: dateTimeString.optional().or(z.literal("")),
  appointmentMeetingType: z.enum(meetingTypes).optional().or(z.literal("")),
  appointmentNotes: optionalText,
  assignedCloserId: z.string().optional().or(z.literal(""))
});

export const callbackSchema = z.object({
  leadBusinessId: z.string().min(1),
  assignedCallerId: z.string().min(1),
  scheduledAt: dateTimeString,
  timezone: z.string().trim().min(2).max(80),
  reason: z.string().trim().min(2).max(180),
  notes: optionalText
});

export const callbackUpdateSchema = z.object({
  callbackId: z.string().min(1),
  scheduledAt: dateTimeString.optional().or(z.literal("")),
  status: z.enum(callbackStatuses).optional(),
  notes: optionalText,
  reason: optionalShort
});

export const leadLockSchema = z.object({
  lockId: z.string().min(1),
  reason: optionalShort
});

export const ownerReachReviewSchema = z.object({
  leadBusinessId: z.string().min(1),
  ownerReachScore: z.coerce.number().int().min(0).max(100),
  ownerReachScoreReasons: optionalText,
  reason: z.string().trim().min(2).max(500)
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().trim().url(),
  p256dh: optionalShort,
  auth: optionalShort,
  userAgent: optionalShort,
  enabled: z.coerce.boolean().default(true)
});

export const opportunitySchema = z.object({
  prospectId: z.string().min(1),
  pipelineStageId: z.string().min(1),
  serviceOfferingId: z.string().optional().or(z.literal("")),
  assignedCloserId: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(180),
  estimatedValue: z.string().trim().min(1).max(32),
  probabilityPercent: z.coerce.number().int().min(0).max(100),
  expectedCloseDate: dateString.optional().or(z.literal("")),
  status: z.enum(opportunityStatuses).default("open"),
  notes: optionalText
});

export const suppressionSchema = z.object({
  prospectId: z.string().optional().or(z.literal("")),
  leadBusinessId: z.string().optional().or(z.literal("")),
  phone: optionalShort,
  email: z.string().trim().email().optional().or(z.literal("")),
  channel: z.enum(["phone", "sms", "email", "all"]),
  reason: z.enum(suppressionReasons),
  source: z.string().trim().max(80).default("manual")
});

export const salesGoalSchema = z.object({
  userId: z.string().optional().or(z.literal("")),
  periodType: z.enum(["daily", "weekly", "monthly"]),
  metric: z.enum(salesGoalMetrics),
  targetValue: z.coerce.number().int().min(1).max(100000000),
  startDate: dateString,
  endDate: dateString
});

export const revenueHandoffSchema = z.object({
  opportunityId: z.string().min(1),
  clientId: z.string().optional().or(z.literal("")),
  businessName: z.string().trim().min(2).max(180).optional().or(z.literal("")),
  serviceOfferingId: z.string().optional().or(z.literal("")),
  contractName: z.string().trim().min(2).max(180),
  contractedAmount: z.string().trim().min(1).max(32),
  depositAmount: moneyString,
  billingType: z.enum(["one_time", "recurring", "project", "usage_based"]),
  startDate: dateString,
  createInitialInvoice: z.coerce.boolean().default(false)
});
