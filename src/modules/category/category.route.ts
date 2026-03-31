import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { getCategoryParams } from "./dto/request.dto.js";
import * as categoryController from "./category.controller.js";

const router = Router();

router.get("/", categoryController.list);
router.get("/:id", validate({ params: getCategoryParams }), categoryController.getById);

export default router;
