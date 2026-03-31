import { Request, Response } from "express";
import { controllerWrapper } from "../../shared/utils/controllerWrapper.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import * as paymentService from "./payment.service.js";

export const razorpayWebhook = controllerWrapper(
  async (req: Request, res: Response) => {
    const signature = req.headers["x-razorpay-signature"] as string;

    await paymentService.handleRazorpayWebhook(
      signature,
      req.rawBody!,
      req.body
    );

    return res.status(HttpStatus.OK).json({ status: "ok" });
  }
);
