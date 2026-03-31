import { z } from "zod/v4";

export const createAddressBody = z.object({
  label: z.string().max(50).optional(),
  addressLine1: z.string().min(1, "Address line 1 is required").max(255),
  addressLine2: z.string().max(255).optional(),
  landmark: z.string().max(255).optional(),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  postalCode: z.string().min(1, "Postal code is required").max(20),
  country: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});

export const updateAddressBody = z.object({
  label: z.string().max(50).optional(),
  addressLine1: z.string().min(1).max(255).optional(),
  addressLine2: z.string().max(255).nullable().optional(),
  landmark: z.string().max(255).nullable().optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  postalCode: z.string().min(1).max(20).optional(),
  country: z.string().max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export const addressIdParams = z.object({
  id: z.string().uuid("Invalid address ID"),
});
