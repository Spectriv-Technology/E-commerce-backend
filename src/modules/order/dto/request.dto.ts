import { z } from "zod/v4";

const orderItemBody = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
});

export const createOrderBody = z.object({
  addressId: z.string().uuid("Invalid address ID"),
  items: z.array(orderItemBody).min(1, "At least one item is required"),
  notes: z.string().max(1000).optional(),
  paymentMethod: z.enum(["COD", "RAZORPAY"]),
  couponCode: z
    .string()
    .transform((val) => val.trim().toUpperCase())
    .optional(),
});

export const listOrdersQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const orderIdParams = z.object({
  id: z.string().uuid("Invalid order ID"),
});

export const updateOrderStatusBody = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "RETURNED",
  ]),
});
