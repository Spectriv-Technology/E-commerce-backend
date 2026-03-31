import { Prisma } from "@prisma/client";

export const productPincodeSelect = {
  id: true,
  productId: true,
  pincodeId: true,
  createdAt: true,
} satisfies Prisma.ProductPincodeSelect;
