import { Request, Response } from "express";
import { controllerWrapper } from "../../shared/utils/controllerWrapper.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import * as addressService from "./address.service.js";
import { CreateAddressInput, UpdateAddressInput } from "./dto/service.dto.js";

export const list = controllerWrapper(async (req: Request, res: Response) => {
  const addresses = await addressService.list(req.customer!.customerId);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Addresses retrieved successfully",
    data: addresses,
  });
});

export const getById = controllerWrapper(async (req: Request, res: Response) => {
  const address = await addressService.getById(req.params.id, req.customer!.customerId);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Address retrieved successfully",
    data: address,
  });
});

export const create = controllerWrapper(async (req: Request, res: Response) => {
  const input = req.body as CreateAddressInput;
  const address = await addressService.create(req.customer!.customerId, input);

  return apiResponse(res, {
    statusCode: HttpStatus.CREATED,
    message: "Address added successfully",
    data: address,
  });
});

export const update = controllerWrapper(async (req: Request, res: Response) => {
  const input = req.body as UpdateAddressInput;
  const address = await addressService.update(req.params.id, req.customer!.customerId, input);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Address updated successfully",
    data: address,
  });
});

export const remove = controllerWrapper(async (req: Request, res: Response) => {
  await addressService.remove(req.params.id, req.customer!.customerId);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Address deleted successfully",
  });
});
