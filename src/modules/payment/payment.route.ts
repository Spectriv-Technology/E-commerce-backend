import { Router } from "express";
import * as paymentController from "./payment.controller.js";

const router = Router();

// No auth middleware — Razorpay sends webhooks directly
router.post("/webhook/razorpay", paymentController.razorpayWebhook);

export default router;
