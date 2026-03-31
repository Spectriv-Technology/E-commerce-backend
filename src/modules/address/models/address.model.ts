import { Prisma } from "@prisma/client";

export const addressSelect = {
  id: true,
  label: true,
  addressLine1: true,
  addressLine2: true,
  landmark: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
  phone: true,
  latitude: true,
  longitude: true,
  isDefault: true,
  customerId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AddressSelect;
