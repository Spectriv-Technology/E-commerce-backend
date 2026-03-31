import { Prisma } from "@prisma/client";

export const customerProfileSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  isPhoneVerified: true,
  isEmailVerified: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CustomerSelect;
