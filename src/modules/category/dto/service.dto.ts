import { Prisma } from "@prisma/client";
import { categoryListSelect, categoryDetailSelect } from "../models/category.model.js";

export type CategoryListItem = Prisma.CategoryGetPayload<{ select: typeof categoryListSelect }>;
export type CategoryDetail = Prisma.CategoryGetPayload<{ select: typeof categoryDetailSelect }>;
