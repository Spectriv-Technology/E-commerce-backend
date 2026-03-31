import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { requireAdmin } from "../../middlewares/auth.middleware.js";
import { authRateLimiter } from "../../middlewares/rateLimiter.middleware.js";
import { sendOtpBody, verifyOtpBody } from "./dto/request.dto.js";
import * as adminController from "./admin.controller.js";

const router = Router();

// ── Auth (public) ──
router.post(
  "/auth/send-otp",
  authRateLimiter,
  validate({ body: sendOtpBody }),
  adminController.sendOtp
);

router.post(
  "/auth/verify-otp",
  authRateLimiter,
  validate({ body: verifyOtpBody }),
  adminController.verifyOtp
);

// ── Profile (authenticated) ──
router.get("/me", requireAdmin, adminController.getProfile);

export default router;
