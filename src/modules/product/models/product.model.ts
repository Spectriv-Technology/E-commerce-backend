import { Prisma } from "@prisma/client";

export const productListSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  comparePrice: true,
  image: true,
  stock: true,
  isFeatured: true,
  categoryId: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  createdAt: true,
} satisfies Prisma.ProductSelect;

export const productDetailSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  comparePrice: true,
  sku: true,
  stock: true,
  image: true,
  images: true,
  isFeatured: true,
  categoryId: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;
