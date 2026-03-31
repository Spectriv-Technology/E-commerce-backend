import { z } from "zod/v4";

const queryBoolean = z
  .enum(["true", "false"])
  .transform((val) => val === "true");

export const listProductsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid("Invalid category ID").optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  featured: queryBoolean.optional(),
  inStock: queryBoolean.optional(),
});

export const getProductParams = z.object({
  id: z.string().uuid("Invalid product ID"),
});
