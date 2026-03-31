import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { listProductsQuery, getProductParams } from "./dto/request.dto.js";
import * as productController from "./product.controller.js";

const router = Router();

router.get("/", validate({ query: listProductsQuery }), productController.list);
router.get("/:id", validate({ params: getProductParams }), productController.getById);

export default router;
