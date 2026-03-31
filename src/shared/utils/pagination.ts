interface PaginationInput {
  page: number;
  limit: number;
}

interface PaginationResult {
  skip: number;
  take: number;
}

export const getPaginationParams = (input: PaginationInput): PaginationResult => {
  return {
    skip: (input.page - 1) * input.limit,
    take: input.limit,
  };
};

export const getPaginationMeta = (page: number, limit: number, total: number) => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};
