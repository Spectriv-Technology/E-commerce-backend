import { Prisma } from "@prisma/client";
import { addressSelect } from "../models/address.model.js";

export type AddressItem = Prisma.AddressGetPayload<{ select: typeof addressSelect }>;

export interface CreateAddressInput {
  label?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface UpdateAddressInput {
  label?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}
