import { z } from "zod";

import {
  adjustmentTypes,
  billingTypes,
  clientStatuses,
  contractStatuses,
  invoiceStatuses,
  paymentMethods,
  paymentStatuses,
  recurringFrequencies,
  recurringStatuses,
  revenueGoalPeriods,
  revenueGoalTypes,
  serviceCategories
} from "@/lib/revenue/constants";

const moneyString = z.string().trim().min(1).max(32);
const optionalText = z.string().trim().max(1000).optional().or(z.literal(""));
const optionalShort = z.string().trim().max(160).optional().or(z.literal(""));
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const revenueGoalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  goalPeriod: z.enum(revenueGoalPeriods),
  goalType: z.enum(revenueGoalTypes),
  targetAmount: moneyString,
  notes: optionalText
});

export const clientSchema = z.object({
  businessName: z.string().trim().min(1).max(160),
  contactName: optionalShort,
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: optionalShort,
  status: z.enum(clientStatuses).default("prospect"),
  source: optionalShort,
  notes: optionalText
});

export const serviceOfferingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: optionalText,
  revenueCategory: z.enum(serviceCategories),
  defaultPrice: z.string().trim().max(32).optional().or(z.literal("")),
  billingType: z.enum(billingTypes),
  active: z.coerce.boolean().default(true)
});

export const contractSchema = z.object({
  clientId: z.string().min(1),
  serviceOfferingId: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(1).max(160),
  contractedAmount: moneyString,
  billingType: z.enum(billingTypes),
  status: z.enum(contractStatuses),
  depositAmount: z.string().trim().max(32).optional().or(z.literal("")),
  mrrAmount: z.string().trim().max(32).optional().or(z.literal("")),
  signedDate: dateString.optional().or(z.literal("")),
  startDate: dateString.optional().or(z.literal("")),
  endDate: dateString.optional().or(z.literal("")),
  notes: optionalText
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1),
  revenueContractId: z.string().optional().or(z.literal("")),
  invoiceNumber: optionalShort,
  totalAmount: moneyString,
  issueDate: dateString,
  dueDate: dateString,
  status: z.enum(invoiceStatuses),
  notes: optionalText
});

export const paymentSchema = z.object({
  clientId: z.string().min(1),
  invoiceId: z.string().optional().or(z.literal("")),
  revenueContractId: z.string().optional().or(z.literal("")),
  amount: moneyString,
  paymentDate: dateString,
  status: z.enum(paymentStatuses),
  paymentMethod: z.enum(paymentMethods).optional().or(z.literal("")),
  idempotencyKey: z.string().trim().max(120).optional().or(z.literal("")),
  notes: optionalText
});

export const recurringRevenueSchema = z.object({
  clientId: z.string().min(1),
  revenueContractId: z.string().min(1),
  amount: moneyString,
  frequency: z.enum(recurringFrequencies),
  startDate: dateString,
  endDate: dateString.optional().or(z.literal("")),
  nextExpectedDate: dateString,
  status: z.enum(recurringStatuses).default("active")
});

export const adjustmentSchema = z.object({
  clientId: z.string().optional().or(z.literal("")),
  invoiceId: z.string().optional().or(z.literal("")),
  paymentId: z.string().optional().or(z.literal("")),
  revenueContractId: z.string().optional().or(z.literal("")),
  adjustmentType: z.enum(adjustmentTypes),
  amount: moneyString,
  effectiveDate: dateString,
  reason: z.string().trim().min(3).max(500)
});

export const recommendationPrioritySchema = z.object({
  title: z.string().trim().min(1).max(180),
  reason: z.string().trim().max(500),
  impactCents: z.coerce.number().int().nonnegative().default(0),
  entityType: z.string().trim().max(80).optional().or(z.literal("")),
  entityId: z.string().trim().max(120).optional().or(z.literal(""))
});
