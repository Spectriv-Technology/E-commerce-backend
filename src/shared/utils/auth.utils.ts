import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.config.js";
import { redis } from "../../config/redis.config.js";
import { HttpError } from "./httpErrors.js";
import { HttpStatus } from "../constants/httpStatus.js";
import { ErrorCode } from "../constants/errorCodes.js";

export const OTP_EXPIRY_SECONDS = 300; // 5 minutes

export const generateOtp = (): string => {
  if (env.NODE_ENV === "development") {
    return "000000";
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateToken = (
  id: string,
  phone: string,
  role: "admin" | "customer"
): string => {
  return jwt.sign(
    { id, phone, role, type: "access" },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as SignOptions
  );
};

export const storeOtp = async (
  prefix: string,
  phone: string
): Promise<string> => {
  const otp = generateOtp();
  await redis.set(`${prefix}_otp:${phone}`, otp, "EX", OTP_EXPIRY_SECONDS);
  return otp;
};

export const verifyOtp = async (
  prefix: string,
  phone: string,
  otp: string
): Promise<void> => {
  const storedOtp = await redis.get(`${prefix}_otp:${phone}`);

  if (!storedOtp) {
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      "OTP not found or expired. Please request a new one",
      ErrorCode.AUTH_OTP_EXPIRED
    );
  }

  if (storedOtp !== otp) {
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      "Invalid OTP",
      ErrorCode.AUTH_OTP_INVALID
    );
  }

  await redis.del(`${prefix}_otp:${phone}`);
};
