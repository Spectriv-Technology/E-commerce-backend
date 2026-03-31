import { PaymentMethod, DiscountType } from "@prisma/client";

export interface ValidateCouponInput {
  couponCode: string;
  subtotal: number;
  paymentMethod: PaymentMethod;
}

export interface CouponValidationResult {
  couponId: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  message: string;
}
