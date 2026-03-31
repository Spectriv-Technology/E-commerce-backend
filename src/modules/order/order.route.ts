import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { customerAuthMiddleware } from "../../middlewares/customerAuth.middleware.js";
import {
  createOrderBody,
  listOrdersQuery,
  orderIdParams,
  updateOrderStatusBody,
} from "./dto/request.dto.js";
import * as orderController from "./order.controller.js";

const router = Router();

// All order routes require customer auth
router.use(customerAuthMiddleware);

router.post(
  "/",
  validate({ body: createOrderBody }),
  orderController.create
);

router.get(
  "/",
  validate({ query: listOrdersQuery }),
  orderController.list
);

router.get(
  "/:id",
  validate({ params: orderIdParams }),
  orderController.getById
);

router.patch(
  "/:id/status",
  validate({ params: orderIdParams, body: updateOrderStatusBody }),
  orderController.updateStatus
);

router.patch(
  "/:id/cancel",
  validate({ params: orderIdParams }),
  orderController.cancel
);

export default router;
