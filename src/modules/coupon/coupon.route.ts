import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { customerAuthMiddleware } from "../../middlewares/customerAuth.middleware.js";
import { validateCouponBody } from "./dto/request.dto.js";
import * as couponController from "./coupon.controller.js";

const router = Router();

// Public — no auth required
router.get("/offers", couponController.offers);

// Protected — auth required
router.use(customerAuthMiddleware);

router.get("/", couponController.list);

router.post(
  "/validate",
  validate({ body: validateCouponBody }),
  couponController.validate
);

export default router;
