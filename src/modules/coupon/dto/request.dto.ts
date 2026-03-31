import { z } from "zod/v4";

export const validateCouponBody = z.object({
  couponCode: z
    .string()
    .min(1, "Coupon code is required")
    .transform((val) => val.trim().toUpperCase()),
  subtotal: z.number().positive("Subtotal must be positive"),
  paymentMethod: z.enum(["COD", "RAZORPAY"]),
});
