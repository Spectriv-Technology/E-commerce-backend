import crypto from "crypto";
import { prisma } from "../../config/database.config.js";
import { env } from "../../config/env.config.js";
import { HttpError } from "../../shared/utils/httpErrors.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import { ErrorCode } from "../../shared/constants/errorCodes.js";
import { logger } from "../../config/logger.config.js";

export const handleRazorpayWebhook = async (
  signature: string,
  rawBody: Buffer,
  parsedBody: Record<string, unknown>
) => {
  // Verify HMAC-SHA256 signature
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      "Invalid webhook signature",
      ErrorCode.PAYMENT_WEBHOOK_INVALID_SIGNATURE
    );
  }

  const event = parsedBody.event as string;
  const payload = parsedBody.payload as Record<string, unknown>;
  const paymentEntity = (payload.payment as Record<string, unknown>)
    ?.entity as Record<string, unknown>;

  if (!paymentEntity) {
    logger.warn("Razorpay webhook: no payment entity in payload", { event });
    return;
  }

  const razorpayOrderId = paymentEntity.order_id as string;
  const razorpayPaymentId = paymentEntity.id as string;

  // Find payment by razorpayOrderId
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId },
    select: { id: true, status: true, orderId: true },
  });

  if (!payment) {
    logger.warn("Razorpay webhook: payment not found", { razorpayOrderId });
    return;
  }

  // Idempotency: skip if already PAID or FAILED
  if (payment.status === "PAID" || payment.status === "FAILED") {
    logger.info("Razorpay webhook: payment already processed", {
      paymentId: payment.id,
      status: payment.status,
    });
    return;
  }

  if (event === "payment.captured") {
    // Payment successful — update payment + confirm order in transaction
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          razorpayPaymentId,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: "CONFIRMED" },
      });
    });

    logger.info("Razorpay webhook: payment captured", {
      paymentId: payment.id,
      razorpayPaymentId,
    });
  } else if (event === "payment.failed") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        razorpayPaymentId,
      },
    });

    logger.info("Razorpay webhook: payment failed", {
      paymentId: payment.id,
      razorpayPaymentId,
    });
  }
};
