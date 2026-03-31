import { prisma } from "../../config/database.config.js";
import { HttpError } from "../../shared/utils/httpErrors.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import { ErrorCode } from "../../shared/constants/errorCodes.js";
import { CheckDeliveryResult } from "./dto/service.dto.js";

export const checkDelivery = async (
  productId: string,
  pincode: string
): Promise<CheckDeliveryResult> => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!product) {
    throw new HttpError(
      HttpStatus.NOT_FOUND,
      "Product not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  const pincodeRecord = await prisma.serviceablePincode.findUnique({
    where: { pincode },
    select: { id: true, pincode: true, city: true, state: true, isActive: true },
  });

  if (!pincodeRecord || !pincodeRecord.isActive) {
    return { deliverable: false, pincode };
  }

  const mapping = await prisma.productPincode.findUnique({
    where: {
      productId_pincodeId: {
        productId,
        pincodeId: pincodeRecord.id,
      },
    },
    select: { id: true },
  });

  return {
    deliverable: !!mapping,
    pincode: pincodeRecord.pincode,
    city: pincodeRecord.city,
    state: pincodeRecord.state,
  };
};
