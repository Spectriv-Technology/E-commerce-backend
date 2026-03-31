import { Prisma } from "@prisma/client";

export const couponValidationSelect = {
  id: true,
  code: true,
  description: true,
  discountType: true,
  discountValue: true,
  maxDiscountAmount: true,
  minOrderAmount: true,
  paymentMethod: true,
  isFirstOrderOnly: true,
  customerId: true,
  maxUses: true,
  maxUsesPerCustomer: true,
  currentUses: true,
  validFrom: true,
  validUntil: true,
  isActive: true,
} satisfies Prisma.CouponSelect;

export const couponListSelect = {
  id: true,
  code: true,
  description: true,
  discountType: true,
  discountValue: true,
  maxDiscountAmount: true,
  minOrderAmount: true,
  paymentMethod: true,
  isFirstOrderOnly: true,
  validFrom: true,
  validUntil: true,
  isFeatured: true,
  banner: true,
} satisfies Prisma.CouponSelect;
