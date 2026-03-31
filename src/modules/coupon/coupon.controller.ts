import { Request, Response } from "express";
import { controllerWrapper } from "../../shared/utils/controllerWrapper.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import * as couponService from "./coupon.service.js";
import { ValidateCouponInput } from "./dto/service.dto.js";

export const offers = controllerWrapper(
  async (_req: Request, res: Response) => {
    const coupons = await couponService.listOffers();

    return apiResponse(res, {
      statusCode: HttpStatus.OK,
      message: "Offers fetched successfully",
      data: coupons,
    });
  }
);

export const list = controllerWrapper(
  async (req: Request, res: Response) => {
    const coupons = await couponService.listCoupons(
      req.auth!.id
    );

    return apiResponse(res, {
      statusCode: HttpStatus.OK,
      message: "Coupons fetched successfully",
      data: coupons,
    });
  }
);

export const validate = controllerWrapper(
  async (req: Request, res: Response) => {
    const input = req.body as ValidateCouponInput;
    const result = await couponService.validateCoupon(
      req.auth!.id,
      input
    );

    return apiResponse(res, {
      statusCode: HttpStatus.OK,
      message: result.message,
      data: result,
    });
  }
);
