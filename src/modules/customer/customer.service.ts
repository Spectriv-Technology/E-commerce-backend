import jwt from "jsonwebtoken";
import { prisma } from "../../config/database.config.js";
import { env } from "../../config/env.config.js";
import { logger } from "../../config/logger.config.js";
import { redis } from "../../config/redis.config.js";
import { HttpError } from "../../shared/utils/httpErrors.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import { ErrorCode } from "../../shared/constants/errorCodes.js";
import { customerProfileSelect } from "./models/customer.model.js";
import {
  SendOtpInput,
  VerifyOtpInput,
  UpdateProfileInput,
} from "./dto/service.dto.js";

const OTP_EXPIRY_SECONDS = 300; // 5 minutes

const generateOtp = (): string => {
  if (env.NODE_ENV === "development") {
    return "000000";
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (customerId: string, phone: string): string => {
  return jwt.sign(
    { customerId, phone, type: "access" },
    env.JWT_ACCESS_SECRET,
    { expiresIn: "14d" }
  );
};

// ── Auth ──

export const sendOtp = async (input: SendOtpInput) => {
  const otp = generateOtp();

  await redis.set(`otp:${input.phone}`, otp, "EX", OTP_EXPIRY_SECONDS);

  // In production, send OTP via SMS provider
  logger.info("OTP sent", { phone: input.phone });

  return { message: "OTP sent successfully" };
};

export const verifyOtp = async (input: VerifyOtpInput) => {
  const storedOtp = await redis.get(`otp:${input.phone}`);

  if (!storedOtp) {
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      "OTP not found or expired. Please request a new one",
      ErrorCode.AUTH_OTP_EXPIRED
    );
  }

  if (storedOtp !== input.otp) {
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      "Invalid OTP",
      ErrorCode.AUTH_OTP_INVALID
    );
  }

  // OTP valid — remove it
  await redis.del(`otp:${input.phone}`);

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

  const token = generateToken(customer.id, customer.phone);

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
