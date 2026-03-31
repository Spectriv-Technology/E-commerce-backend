import { Request, Response } from "express";
import { controllerWrapper } from "../../shared/utils/controllerWrapper.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import * as productPincodeService from "./product-pincode.service.js";

export const checkDelivery = controllerWrapper(
  async (req: Request, res: Response) => {
    const result = await productPincodeService.checkDelivery(
      req.params.productId,
      req.params.pincode
    );

    return apiResponse(res, {
      statusCode: HttpStatus.OK,
      message: result.deliverable
        ? "Product is deliverable to this pincode"
        : "Product is not deliverable to this pincode",
      data: result,
    });
  }
);
