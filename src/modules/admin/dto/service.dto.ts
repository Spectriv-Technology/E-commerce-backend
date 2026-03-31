import { Prisma } from "@prisma/client";
import { adminProfileSelect } from "../models/admin.model.js";

export type AdminProfile = Prisma.AdminGetPayload<{ select: typeof adminProfileSelect }>;

export interface SendOtpInput {
  phone: string;
}

export interface VerifyOtpInput {
  phone: string;
  otp: string;
  name?: string;
}
