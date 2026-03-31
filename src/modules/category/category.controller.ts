import { Request, Response } from "express";
import { controllerWrapper } from "../../shared/utils/controllerWrapper.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import * as categoryService from "./category.service.js";

export const list = controllerWrapper(async (_req: Request, res: Response) => {
  const categories = await categoryService.list();

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Categories retrieved successfully",
    data: categories,
  });
});

export const getById = controllerWrapper(async (req: Request, res: Response) => {
  const category = await categoryService.getById(req.params.id);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Category retrieved successfully",
    data: category,
  });
});
