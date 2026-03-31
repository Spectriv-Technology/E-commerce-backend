import { Prisma } from "@prisma/client";

export const categoryListSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  image: true,
  sortOrder: true,
  parentId: true,
  _count: {
    select: {
      children: { where: { isActive: true } },
      products: { where: { isActive: true } },
    },
  },
} satisfies Prisma.CategorySelect;

export const categoryDetailSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  image: true,
  sortOrder: true,
  parentId: true,
  children: {
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" as const }, { name: "asc" as const }],
  },
} satisfies Prisma.CategorySelect;
