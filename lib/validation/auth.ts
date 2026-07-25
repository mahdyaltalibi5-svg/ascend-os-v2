import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(128)
    .regex(/[a-z]/, "Use at least one lowercase letter.")
    .regex(/[A-Z]/, "Use at least one uppercase letter.")
    .regex(/[0-9]/, "Use at least one number.")
});

export const signInSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128)
});
