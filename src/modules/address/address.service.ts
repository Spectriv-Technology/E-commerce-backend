import { prisma } from "../../config/database.config.js";
import { HttpError } from "../../shared/utils/httpErrors.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import { ErrorCode } from "../../shared/constants/errorCodes.js";
import { addressSelect } from "./models/address.model.js";
import { CreateAddressInput, UpdateAddressInput } from "./dto/service.dto.js";

export const list = async (customerId: string) => {
  return prisma.address.findMany({
    where: { customerId },
    select: addressSelect,
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
};

export const getById = async (id: string, customerId: string) => {
  const address = await prisma.address.findFirst({
    where: { id, customerId },
    select: addressSelect,
  });

  if (!address) {
    throw new HttpError(
      HttpStatus.NOT_FOUND,
      "Address not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  return address;
};

export const create = async (customerId: string, input: CreateAddressInput) => {
  // If this is set as default, unset other defaults
  if (input.isDefault) {
    await prisma.address.updateMany({
      where: { customerId, isDefault: true },
      data: { isDefault: false },
    });
  }

  // If this is the customer's first address, make it default
  const existingCount = await prisma.address.count({ where: { customerId } });
  const isDefault = input.isDefault ?? existingCount === 0;

  const address = await prisma.address.create({
    data: {
      ...input,
      isDefault,
      customerId,
    },
    select: addressSelect,
  });

  return address;
};

export const update = async (id: string, customerId: string, input: UpdateAddressInput) => {
  // Verify address belongs to customer
  const existing = await prisma.address.findFirst({
    where: { id, customerId },
    select: { id: true },
  });

  if (!existing) {
    throw new HttpError(
      HttpStatus.NOT_FOUND,
      "Address not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  // If setting as default, unset other defaults
  if (input.isDefault) {
    await prisma.address.updateMany({
      where: { customerId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.update({
    where: { id },
    data: input,
    select: addressSelect,
  });

  return address;
};

export const remove = async (id: string, customerId: string) => {
  const existing = await prisma.address.findFirst({
    where: { id, customerId },
    select: { id: true, isDefault: true },
  });

  if (!existing) {
    throw new HttpError(
      HttpStatus.NOT_FOUND,
      "Address not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  await prisma.address.delete({ where: { id } });

  // If deleted address was default, make the most recent one default
  if (existing.isDefault) {
    const nextDefault = await prisma.address.findFirst({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (nextDefault) {
      await prisma.address.update({
        where: { id: nextDefault.id },
        data: { isDefault: true },
      });
    }
  }
};
