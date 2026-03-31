import { Request, Response } from "express";
import { controllerWrapper } from "../../shared/utils/controllerWrapper.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import { getPaginationMeta } from "../../shared/utils/pagination.js";
import * as productService from "./product.service.js";
import { ListProductsInput } from "./dto/service.dto.js";

export const list = controllerWrapper(async (req: Request, res: Response) => {
  const input = req.query as unknown as ListProductsInput;
  const { products, total } = await productService.list(input);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Products retrieved successfully",
    data: products,
    meta: getPaginationMeta(input.page, input.limit, total),
  });
});

export const getById = controllerWrapper(async (req: Request, res: Response) => {
  const product = await productService.getById(req.params.id);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Product retrieved successfully",
    data: product,
  });
});
