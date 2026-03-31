import { Prisma } from "@prisma/client";
import { customerProfileSelect } from "../models/customer.model.js";

export type CustomerProfile = Prisma.CustomerGetPayload<{ select: typeof customerProfileSelect }>;

export interface SendOtpInput {
  phone: string;
}

export interface VerifyOtpInput {
  phone: string;
  otp: string;
  name?: string;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
}
