import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { requireCustomer } from "../../middlewares/auth.middleware.js";
import { validateCouponBody } from "./dto/request.dto.js";
import * as couponController from "./coupon.controller.js";

const router = Router();

// Public — no auth required
router.get("/offers", couponController.offers);

// Protected — auth required
router.use(requireCustomer);

router.get("/", couponController.list);

router.post(
  "/validate",
  validate({ body: validateCouponBody }),
  couponController.validate
);

export default router;
