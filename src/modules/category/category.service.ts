import { prisma } from "../../config/database.config.js";
import { HttpError } from "../../shared/utils/httpErrors.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import { ErrorCode } from "../../shared/constants/errorCodes.js";
import { categoryListSelect, categoryDetailSelect } from "./models/category.model.js";

export const list = async () => {
  return prisma.category.findMany({
    where: { isActive: true },
    select: categoryListSelect,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
};

export const getById = async (id: string) => {
  const category = await prisma.category.findFirst({
    where: { id, isActive: true },
    select: categoryDetailSelect,
  });

  if (!category) {
    throw new HttpError(HttpStatus.NOT_FOUND, "Category not found", ErrorCode.RESOURCE_NOT_FOUND);
  }

  return category;
};
