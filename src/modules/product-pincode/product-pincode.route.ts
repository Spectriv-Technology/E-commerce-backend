import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { checkDeliveryParams } from "./dto/request.dto.js";
import * as productPincodeController from "./product-pincode.controller.js";

const router = Router();

router.get(
  "/check/:productId/:pincode",
  validate({ params: checkDeliveryParams }),
  productPincodeController.checkDelivery
);

export default router;
