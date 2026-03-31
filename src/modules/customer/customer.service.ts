import { prisma } from "../../config/database.config.js";
import { logger } from "../../config/logger.config.js";
import { HttpError } from "../../shared/utils/httpErrors.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import { ErrorCode } from "../../shared/constants/errorCodes.js";
import {
  storeOtp,
  verifyOtp as verifyStoredOtp,
  generateToken,
} from "../../shared/utils/auth.utils.js";
import { customerProfileSelect } from "./models/customer.model.js";
import {
  SendOtpInput,
  VerifyOtpInput,
  UpdateProfileInput,
} from "./dto/service.dto.js";

// ── Auth ──

export const sendOtp = async (input: SendOtpInput) => {
  await storeOtp("customer", input.phone);

  // In production, send OTP via SMS provider
  logger.info("OTP sent", { phone: input.phone });

  return { message: "OTP sent successfully" };
};

export const verifyOtp = async (input: VerifyOtpInput) => {
  await verifyStoredOtp("customer", input.phone, input.otp);

  // Find or create customer
  let customer = await prisma.customer.findUnique({
    where: { phone: input.phone },
    select: customerProfileSelect,
  });

  if (customer && !customer.isActive) {
    throw new HttpError(
      HttpStatus.FORBIDDEN,
      "Account has been deactivated",
      ErrorCode.AUTH_CUSTOMER_DEACTIVATED
    );
  }

  const isNewCustomer = !customer;

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        phone: input.phone,
        name: input.name || "Customer",
        isPhoneVerified: true,
      },
      select: customerProfileSelect,
    });
  } else if (!customer.isPhoneVerified) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { isPhoneVerified: true },
      select: customerProfileSelect,
    });
  }

  const token = generateToken(customer.id, customer.phone, "customer");

  return { customer, token, isNewCustomer };
};

// ── Profile ──

export const getProfile = async (customerId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: customerProfileSelect,
  });

  if (!customer) {
    throw new HttpError(
      HttpStatus.NOT_FOUND,
      "Customer not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  return customer;
};

export const updateProfile = async (customerId: string, input: UpdateProfileInput) => {
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email, isEmailVerified: false }),
    },
    select: customerProfileSelect,
  });

  return customer;
};
