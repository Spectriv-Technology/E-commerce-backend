import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { requireCustomer } from "../../middlewares/auth.middleware.js";
import { createAddressBody, updateAddressBody, addressIdParams } from "./dto/request.dto.js";
import * as addressController from "./address.controller.js";

const router = Router();

// All address routes require customer auth
router.use(requireCustomer);

router.get("/", addressController.list);

router.get(
  "/:id",
  validate({ params: addressIdParams }),
  addressController.getById
);

router.post(
  "/",
  validate({ body: createAddressBody }),
  addressController.create
);

router.patch(
  "/:id",
  validate({ params: addressIdParams, body: updateAddressBody }),
  addressController.update
);

router.delete(
  "/:id",
  validate({ params: addressIdParams }),
  addressController.remove
);

export default router;
