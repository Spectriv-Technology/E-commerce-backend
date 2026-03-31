import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database.config.js";
import { HttpError } from "../../shared/utils/httpErrors.js";
import { HttpStatus } from "../../shared/constants/httpStatus.js";
import { ErrorCode } from "../../shared/constants/errorCodes.js";
import { getPaginationParams } from "../../shared/utils/pagination.js";
import { productListSelect, productDetailSelect } from "./models/product.model.js";
import { ListProductsInput } from "./dto/service.dto.js";

export const list = async (input: ListProductsInput) => {
  const { page, limit, search, categoryId, minPrice, maxPrice, featured, inStock } = input;
  const { skip, take } = getPaginationParams({ page, limit });

  const where: Prisma.ProductWhereInput = { isActive: true };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (categoryId) where.categoryId = categoryId;

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      ...(minPrice !== undefined && { gte: minPrice }),
      ...(maxPrice !== undefined && { lte: maxPrice }),
    };
  }

  if (featured !== undefined) where.isFeatured = featured;
  if (inStock !== undefined) where.stock = inStock ? { gt: 0 } : { lte: 0 };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productListSelect,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total };
};

export const getById = async (id: string) => {
  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    select: productDetailSelect,
  });

  if (!product) {
    throw new HttpError(HttpStatus.NOT_FOUND, "Product not found", ErrorCode.RESOURCE_NOT_FOUND);
  }

  return product;
};
