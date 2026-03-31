import { Prisma } from "@prisma/client";

export const orderItemSelect = {
  id: true,
  productId: true,
  productName: true,
  productImage: true,
  productPrice: true,
  quantity: true,
  totalPrice: true,
} satisfies Prisma.OrderItemSelect;

export const paymentSelect = {
  id: true,
  method: true,
  status: true,
  amount: true,
  razorpayOrderId: true,
  razorpayPaymentId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PaymentSelect;

export const orderListSelect = {
  id: true,
  orderNumber: true,
  status: true,
  subtotal: true,
  deliveryCharge: true,
  discount: true,
  totalAmount: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: true } },
  payment: { select: paymentSelect },
} satisfies Prisma.OrderSelect;

export const orderDetailSelect = {
  id: true,
  orderNumber: true,
  customerId: true,
  status: true,
  subtotal: true,
  deliveryCharge: true,
  discount: true,
  totalAmount: true,
  deliveryAddress: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  items: { select: orderItemSelect },
  payment: { select: paymentSelect },
  couponUsage: {
    select: {
      coupon: {
        select: {
          code: true,
          description: true,
          discountType: true,
          discountValue: true,
        },
      },
    },
  },
} satisfies Prisma.OrderSelect;
