import { Request, Response } from "express";
import { controllerWrapper } from "../../shared/utils/controllerWrapper.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import * as adminService from "./admin.service.js";
import { SendOtpInput, VerifyOtpInput } from "./dto/service.dto.js";

// ── Auth ──

export const sendOtp = controllerWrapper(async (req: Request, res: Response) => {
  const input = req.body as SendOtpInput;
  const result = await adminService.sendOtp(input);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: result.message,
  });
});

export const verifyOtp = controllerWrapper(async (req: Request, res: Response) => {
  const input = req.body as VerifyOtpInput;
  const result = await adminService.verifyOtp(input);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Login successful",
    data: {
      admin: result.admin,
      token: result.token,
    },
  });
});

// ── Profile ──

export const getProfile = controllerWrapper(async (req: Request, res: Response) => {
  const admin = await adminService.getProfile(req.auth!.id);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Profile retrieved successfully",
    data: admin,
  });
});
