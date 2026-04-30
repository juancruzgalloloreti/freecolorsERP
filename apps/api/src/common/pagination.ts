export type PageQuery = {
  page?: string | number;
  limit?: string | number;
};

export function pageParams(query: PageQuery, fallbackLimit = 50, maxLimit = 200) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || fallbackLimit), 1), maxLimit);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function paged<T>(items: T[], total: number, page: number, limit: number) {
  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

export function asArrayResponse<T>(value: T[] | { data: T[] }): T[] {
  return Array.isArray(value) ? value : value.data;
}
