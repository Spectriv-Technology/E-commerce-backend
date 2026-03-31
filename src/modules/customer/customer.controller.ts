import { Request, Response } from "express";
import { controllerWrapper } from "../../shared/utils/controllerWrapper.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import * as customerService from "./customer.service.js";
import { SendOtpInput, VerifyOtpInput, UpdateProfileInput } from "./dto/service.dto.js";
import { logger } from "../../config/logger.config.js";

// ── Auth ──

export const sendOtp = controllerWrapper(async (req: Request, res: Response) => {
  const input = req.body as SendOtpInput;
  const result = await customerService.sendOtp(input);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: result.message,
  });
});

export const verifyOtp = controllerWrapper(async (req: Request, res: Response) => {
  const input = req.body as VerifyOtpInput;
  logger.info("Verifying OTP", { input });
  const result = await customerService.verifyOtp(input);

  return apiResponse(res, {
    statusCode: result.isNewCustomer ? HttpStatus.CREATED : HttpStatus.OK,
    message: result.isNewCustomer ? "Account created successfully" : "Login successful",
    data: {
      customer: result.customer,
      token: result.token,
      isNewCustomer: result.isNewCustomer,
    },
  });
});

// ── Profile ──

export const getProfile = controllerWrapper(async (req: Request, res: Response) => {
  const customer = await customerService.getProfile(req.customer!.customerId);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Profile retrieved successfully",
    data: customer,
  });
});

export const updateProfile = controllerWrapper(async (req: Request, res: Response) => {
  const input = req.body as UpdateProfileInput;
  const customer = await customerService.updateProfile(req.customer!.customerId, input);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Profile updated successfully",
    data: customer,
  });
});
