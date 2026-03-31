import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "../../config/database.config.js";
import { HttpError } from "../../shared/utils/httpErrors.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import { ErrorCode } from "../../shared/constants/errorCodes.js";
import {
  couponValidationSelect,
  couponListSelect,
} from "./models/coupon.model.js";
import {
  ValidateCouponInput,
  CouponValidationResult,
} from "./dto/service.dto.js";

export const listOffers = async () => {
  const now = new Date();

  return prisma.coupon.findMany({
    where: {
      isActive: true,
      isFeatured: true,
      customerId: null,
      validFrom: { lte: now },
      validUntil: { gte: now },
    },
    select: couponListSelect,
    orderBy: [{ validUntil: "asc" }],
  });
};

export const listCoupons = async (customerId: string) => {
  const now = new Date();

  return prisma.coupon.findMany({
    where: {
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
      OR: [{ customerId: null }, { customerId }],
    },
    select: couponListSelect,
    orderBy: [{ isFeatured: "desc" }, { validUntil: "asc" }],
  });
};

export const validateCoupon = async (
  customerId: string,
  input: ValidateCouponInput
): Promise<CouponValidationResult> => {
  const now = new Date();

  // 1. Find coupon by code
  const coupon = await prisma.coupon.findUnique({
    where: { code: input.couponCode },
    select: couponValidationSelect,
  });

  if (!coupon) {
    throw new HttpError(
      HttpStatus.NOT_FOUND,
      "Coupon not found",
      ErrorCode.COUPON_NOT_FOUND
    );
  }

  // 2. Check active status
  if (!coupon.isActive) {
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      "This coupon is no longer active",
      ErrorCode.COUPON_INACTIVE
    );
  }

  // 3. Check validFrom
  if (coupon.validFrom > now) {
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      "This coupon is not yet valid",
      ErrorCode.COUPON_NOT_YET_VALID
    );
  }

  // 4. Check validUntil
  if (coupon.validUntil < now) {
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      "This coupon has expired",
      ErrorCode.COUPON_EXPIRED
    );
  }

  // 5. Customer restriction
  if (coupon.customerId && coupon.customerId !== customerId) {
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      "This coupon is not available for your account",
      ErrorCode.COUPON_CUSTOMER_RESTRICTED
    );
  }

  // 6. Payment method restriction
  if (coupon.paymentMethod && coupon.paymentMethod !== input.paymentMethod) {
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      `This coupon is only valid for ${coupon.paymentMethod} payments`,
      ErrorCode.COUPON_PAYMENT_METHOD_MISMATCH
    );
  }

  // 7. Minimum order amount
  if (
    coupon.minOrderAmount &&
    new Decimal(input.subtotal).lt(coupon.minOrderAmount)
  ) {
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      `Minimum order amount of ₹${coupon.minOrderAmount} is required`,
      ErrorCode.COUPON_MIN_ORDER_NOT_MET
    );
  }

  // 8. First order only
  if (coupon.isFirstOrderOnly) {
    const orderCount = await prisma.order.count({
      where: {
        customerId,
        status: { not: "CANCELLED" },
      },
    });

    if (orderCount > 0) {
      throw new HttpError(
        HttpStatus.BAD_REQUEST,
        "This coupon is valid for first orders only",
        ErrorCode.COUPON_FIRST_ORDER_ONLY
      );
    }
  }

  // 9. Global max uses
  if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      "This coupon has reached its maximum usage limit",
      ErrorCode.COUPON_MAX_USES_REACHED
    );
  }

  // 10. Per-customer max uses
  if (coupon.maxUsesPerCustomer !== null) {
    const customerUsageCount = await prisma.couponUsage.count({
      where: { couponId: coupon.id, customerId },
    });

    if (customerUsageCount >= coupon.maxUsesPerCustomer) {
      throw new HttpError(
        HttpStatus.BAD_REQUEST,
        "You have already used this coupon the maximum number of times",
        ErrorCode.COUPON_MAX_USES_PER_CUSTOMER_REACHED
      );
    }
  }

  // 11. Calculate discount amount
  const subtotal = new Decimal(input.subtotal);
  let discountAmount: Decimal;

  if (coupon.discountType === "PERCENTAGE") {
    discountAmount = subtotal.mul(coupon.discountValue).div(100);
    if (coupon.maxDiscountAmount) {
      discountAmount = Decimal.min(discountAmount, coupon.maxDiscountAmount);
    }
  } else {
    // FLAT
    discountAmount = Decimal.min(coupon.discountValue, subtotal);
  }

  return {
    couponId: coupon.id,
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue.toNumber(),
    discountAmount: discountAmount.toNumber(),
    message: "Coupon applied successfully",
  };
};
