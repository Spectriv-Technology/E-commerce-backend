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
import { adminProfileSelect } from "./models/admin.model.js";
import { SendOtpInput, VerifyOtpInput } from "./dto/service.dto.js";

// ── Auth ──

export const sendOtp = async (input: SendOtpInput) => {
  // Only allow OTP for existing admins
  const admin = await prisma.admin.findUnique({
    where: { phone: input.phone },
  });

  if (!admin) {
    throw new HttpError(
      HttpStatus.FORBIDDEN,
      "Phone number is not registered as admin",
      ErrorCode.AUTH_INSUFFICIENT_PERMISSION
    );
  }

  if (!admin.isActive) {
    throw new HttpError(
      HttpStatus.FORBIDDEN,
      "Admin account has been deactivated",
      ErrorCode.AUTH_ACCOUNT_DEACTIVATED
    );
  }

  await storeOtp("admin", input.phone);

  logger.info("Admin OTP sent", { phone: input.phone });

  return { message: "OTP sent successfully" };
};

export const verifyOtp = async (input: VerifyOtpInput) => {
  await verifyStoredOtp("admin", input.phone, input.otp);

  const admin = await prisma.admin.findUnique({
    where: { phone: input.phone },
    select: adminProfileSelect,
  });

  if (!admin) {
    throw new HttpError(
      HttpStatus.FORBIDDEN,
      "Phone number is not registered as admin",
      ErrorCode.AUTH_INSUFFICIENT_PERMISSION
    );
  }

  if (!admin.isActive) {
    throw new HttpError(
      HttpStatus.FORBIDDEN,
      "Admin account has been deactivated",
      ErrorCode.AUTH_ACCOUNT_DEACTIVATED
    );
  }

  const token = generateToken(admin.id, admin.phone, "admin");

  return { admin, token };
};

// ── Profile ──

export const getProfile = async (userId: string) => {
  const admin = await prisma.admin.findUnique({
    where: { id: userId },
    select: adminProfileSelect,
  });

  if (!admin) {
    throw new HttpError(
      HttpStatus.NOT_FOUND,
      "Admin not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  return admin;
};
