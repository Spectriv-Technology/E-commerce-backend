import { z } from "zod/v4";

export const getCategoryParams = z.object({
  id: z.string().uuid("Invalid category ID"),
});
