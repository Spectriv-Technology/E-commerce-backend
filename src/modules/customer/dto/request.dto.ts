import { z } from "zod/v4";

export const sendOtpBody = z.object({
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .max(20, "Phone number must be at most 20 characters"),
});

export const verifyOtpBody = z.object({
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .max(20, "Phone number must be at most 20 characters"),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .optional(),
});

export const updateProfileBody = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email("Invalid email address").max(255).optional(),
});
