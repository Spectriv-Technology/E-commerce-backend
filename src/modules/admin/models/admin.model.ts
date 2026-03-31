import { Prisma } from "@prisma/client";

export const adminProfileSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AdminSelect;
