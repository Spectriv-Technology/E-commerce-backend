import { OrderStatus, PaymentMethod } from "@prisma/client";

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  addressId: string;
  items: CreateOrderItemInput[];
  notes?: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
}

export interface ListOrdersInput {
  page: number;
  limit: number;
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
}
