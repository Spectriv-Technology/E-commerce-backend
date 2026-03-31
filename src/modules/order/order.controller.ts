import { Request, Response } from "express";
import { controllerWrapper } from "../../shared/utils/controllerWrapper.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import { getPaginationMeta } from "../../shared/utils/pagination.js";
import * as orderService from "./order.service.js";
import {
  CreateOrderInput,
  ListOrdersInput,
  UpdateOrderStatusInput,
} from "./dto/service.dto.js";

export const create = controllerWrapper(async (req: Request, res: Response) => {
  const input = req.body as CreateOrderInput;
  const order = await orderService.create(req.auth!.id, input);

  const message =
    input.paymentMethod === "RAZORPAY"
      ? "Order created. Complete payment to confirm."
      : "Order placed successfully";

  return apiResponse(res, {
    statusCode: HttpStatus.CREATED,
    message,
    data: order,
  });
});

export const list = controllerWrapper(async (req: Request, res: Response) => {
  const input = req.query as unknown as ListOrdersInput;
  const { orders, total } = await orderService.list(
    req.auth!.id,
    input
  );

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Orders retrieved successfully",
    data: orders,
    meta: getPaginationMeta(input.page, input.limit, total),
  });
});

export const getById = controllerWrapper(
  async (req: Request, res: Response) => {
    const order = await orderService.getById(
      req.params.id,
      req.auth!.id
    );

    return apiResponse(res, {
      statusCode: HttpStatus.OK,
      message: "Order retrieved successfully",
      data: order,
    });
  }
);

export const updateStatus = controllerWrapper(
  async (req: Request, res: Response) => {
    const input = req.body as UpdateOrderStatusInput;
    const order = await orderService.updateStatus(
      req.params.id,
      req.auth!.id,
      input
    );

    return apiResponse(res, {
      statusCode: HttpStatus.OK,
      message: "Order status updated successfully",
      data: order,
    });
  }
);

export const cancel = controllerWrapper(
  async (req: Request, res: Response) => {
    const order = await orderService.cancel(
      req.params.id,
      req.auth!.id
    );

    return apiResponse(res, {
      statusCode: HttpStatus.OK,
      message: "Order cancelled successfully",
      data: order,
    });
  }
);
