import { z } from "zod/v4";

export const checkDeliveryParams = z.object({
  productId: z.string().uuid("Invalid product ID"),
  pincode: z.string().min(1, "Pincode is required").max(10),
});
