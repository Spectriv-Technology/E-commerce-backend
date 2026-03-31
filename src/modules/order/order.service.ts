import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "../../config/database.config.js";
import { razorpay } from "../../config/razorpay.config.js";
import { env } from "../../config/env.config.js";
import { HttpError } from "../../shared/utils/httpErrors.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import { ErrorCode } from "../../shared/constants/errorCodes.js";
import { getPaginationParams } from "../../shared/utils/pagination.js";
import { orderListSelect, orderDetailSelect } from "./models/order.model.js";
import {
  CreateOrderInput,
  ListOrdersInput,
  UpdateOrderStatusInput,
} from "./dto/service.dto.js";
import { validateCoupon } from "../coupon/coupon.service.js";

const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}${random}`;
};

export const create = async (customerId: string, input: CreateOrderInput) => {
  // Verify customer exists & is active
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, isActive: true },
  });

  if (!customer) {
    throw new HttpError(
      HttpStatus.NOT_FOUND,
      "Customer not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  if (!customer.isActive) {
    throw new HttpError(
      HttpStatus.FORBIDDEN,
      "Customer account is deactivated",
      ErrorCode.AUTH_CUSTOMER_DEACTIVATED
    );
  }

  // Fetch address & verify it belongs to customer
  const address = await prisma.address.findFirst({
    where: { id: input.addressId, customerId },
  });

  if (!address) {
    throw new HttpError(
      HttpStatus.NOT_FOUND,
      "Address not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  // Fetch all products by IDs
  const productIds = input.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, image: true, price: true, stock: true, isActive: true },
  });

  // Verify all products exist
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of input.items) {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new HttpError(
        HttpStatus.NOT_FOUND,
        `Product not found: ${item.productId}`,
        ErrorCode.RESOURCE_NOT_FOUND
      );
    }

    if (!product.isActive) {
      throw new HttpError(
        HttpStatus.BAD_REQUEST,
        `Product is not available: ${product.name}`,
        ErrorCode.VALIDATION_FAILED
      );
    }

    if (product.stock < item.quantity) {
      throw new HttpError(
        HttpStatus.BAD_REQUEST,
        `Insufficient stock for ${product.name}. Available: ${product.stock}`,
        ErrorCode.VALIDATION_FAILED
      );
    }
  }

  // Calculate totals
  let subtotal = new Decimal(0);
  const orderItems = input.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const totalPrice = product.price.mul(item.quantity);
    subtotal = subtotal.add(totalPrice);

    return {
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      productPrice: product.price,
      quantity: item.quantity,
      totalPrice,
    };
  });

  const deliveryCharge = new Decimal(0);

  // Validate coupon if provided
  let discount = new Decimal(0);
  let couponId: string | null = null;
  if (input.couponCode) {
    const couponResult = await validateCoupon(customerId, {
      couponCode: input.couponCode,
      subtotal: subtotal.toNumber(),
      paymentMethod: input.paymentMethod,
    });
    discount = new Decimal(couponResult.discountAmount);
    couponId = couponResult.couponId;
  }

  const totalAmount = subtotal.add(deliveryCharge).sub(discount);

  // Snapshot address
  const deliveryAddress = {
    label: address.label,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    landmark: address.landmark,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    phone: address.phone,
  };

  // Create Razorpay order if payment method is RAZORPAY
  let razorpayOrderId: string | null = null;
  if (input.paymentMethod === "RAZORPAY") {
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: totalAmount.mul(100).toNumber(), // amount in paise
        currency: "INR",
        receipt: generateOrderNumber(),
      });
      razorpayOrderId = razorpayOrder.id;
    } catch {
      throw new HttpError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Failed to create Razorpay order",
        ErrorCode.PAYMENT_RAZORPAY_ORDER_FAILED
      );
    }
  }

  // Create order + items + payment in a transaction, decrement stock
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        subtotal,
        deliveryCharge,
        discount,
        totalAmount,
        deliveryAddress,
        notes: input.notes,
        items: {
          create: orderItems,
        },
        payment: {
          create: {
            method: input.paymentMethod,
            status: "PENDING",
            amount: totalAmount,
            razorpayOrderId,
          },
        },
      },
      select: orderDetailSelect,
    });

    // Decrement stock for each product
    for (const item of input.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Record coupon usage and increment counter
    if (couponId) {
      await tx.couponUsage.create({
        data: {
          couponId,
          customerId,
          orderId: created.id,
        },
      });

      await tx.coupon.update({
        where: { id: couponId },
        data: { currentUses: { increment: 1 } },
      });
    }

    return created;
  });

  // For Razorpay, return checkout data alongside the order
  if (input.paymentMethod === "RAZORPAY") {
    return {
      ...order,
      razorpayCheckout: {
        razorpayOrderId,
        razorpayKeyId: env.RAZORPAY_KEY_ID,
        amount: totalAmount.mul(100).toNumber(),
        currency: "INR",
      },
    };
  }

  return order;
};

export const list = async (customerId: string, input: ListOrdersInput) => {
  const { page, limit } = input;
  const { skip, take } = getPaginationParams({ page, limit });

  const where = { customerId };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      select: orderListSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total };
};

export const getById = async (id: string, customerId: string) => {
  const order = await prisma.order.findFirst({
    where: { id, customerId },
    select: orderDetailSelect,
  });

  if (!order) {
    throw new HttpError(
      HttpStatus.NOT_FOUND,
      "Order not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  return order;
};

export const updateStatus = async (
  id: string,
  customerId: string,
  input: UpdateOrderStatusInput
) => {
  const order = await prisma.order.findFirst({
    where: { id, customerId },
    select: { id: true, status: true },
  });

  if (!order) {
    throw new HttpError(
      HttpStatus.NOT_FOUND,
      "Order not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: input.status },
    select: orderDetailSelect,
  });

  return updated;
};

export const cancel = async (id: string, customerId: string) => {
  const order = await prisma.order.findFirst({
    where: { id, customerId },
    select: {
      id: true,
      status: true,
      items: { select: { productId: true, quantity: true } },
      payment: { select: { id: true, method: true, status: true } },
    },
  });

  if (!order) {
    throw new HttpError(
      HttpStatus.NOT_FOUND,
      "Order not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  if (order.status !== "PENDING" && order.status !== "CONFIRMED") {
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      "Order can only be cancelled when status is PENDING or CONFIRMED",
      ErrorCode.VALIDATION_FAILED
    );
  }

  // Block cancellation if Razorpay payment is already PAID
  if (
    order.payment?.method === "RAZORPAY" &&
    order.payment.status === "PAID"
  ) {
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      "Cannot cancel order with a completed Razorpay payment. Please request a refund instead.",
      ErrorCode.VALIDATION_FAILED
    );
  }

  // Cancel order, restore stock, and update payment status in a transaction
  const updated = await prisma.$transaction(async (tx) => {
    const cancelled = await tx.order.update({
      where: { id },
      data: { status: "CANCELLED" },
      select: orderDetailSelect,
    });

    // Restore stock for each item
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    // Set payment status to FAILED if pending
    if (order.payment && order.payment.status === "PENDING") {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: { status: "FAILED" },
      });
    }

    return cancelled;
  });

  return updated;
};
