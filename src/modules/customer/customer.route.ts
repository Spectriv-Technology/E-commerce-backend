import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { customerAuthMiddleware } from "../../middlewares/customerAuth.middleware.js";
import { authRateLimiter } from "../../middlewares/rateLimiter.middleware.js";
import {
  sendOtpBody,
  verifyOtpBody,
  updateProfileBody,
} from "./dto/request.dto.js";
import * as customerController from "./customer.controller.js";

const router = Router();

// ── Auth (public) ──
router.post(
  "/auth/send-otp",
  authRateLimiter,
  validate({ body: sendOtpBody }),
  customerController.sendOtp
);

router.post(
  "/auth/verify-otp",
  authRateLimiter,
  validate({ body: verifyOtpBody }),
  customerController.verifyOtp
);

// ── Profile (authenticated) ──
router.get("/me", customerAuthMiddleware, customerController.getProfile);

router.patch(
  "/me",
  customerAuthMiddleware,
  validate({ body: updateProfileBody }),
  customerController.updateProfile
);

export default router;
