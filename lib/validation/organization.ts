import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Enter an organization name.").max(120),
  website: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine((value) => !value || /^https?:\/\/.+\..+/.test(value), {
      message: "Use a full URL such as https://example.com."
    }),
  timezone: z.string().trim().min(2).max(80),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  theme: z.enum(["dark", "light"]).default("dark"),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#3B82F6"),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#38BDF8")
});

export const activeOrganizationSchema = z.object({
  organizationId: z.string().min(1)
});

export const createInvitationSchema = z.object({
  email: z.string().trim().email().max(255)
});
