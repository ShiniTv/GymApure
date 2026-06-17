export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function parsePaginationQuery(
  query: Record<string, unknown>,
  defaults: { page?: number; pageSize?: number; maxPageSize?: number } = {}
) {
  const defaultPage = defaults.page ?? 1;
  const defaultPageSize = defaults.pageSize ?? 20;
  const maxPageSize = defaults.maxPageSize ?? 100;

  const page = Math.max(1, parseInt(String(query.page ?? defaultPage), 10) || defaultPage);
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, parseInt(String(query.limit ?? query.pageSize ?? defaultPageSize), 10) || defaultPageSize)
  );

  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function parseSearchQuery(query: Record<string, unknown>): string {
  return typeof query.q === 'string' ? query.q.trim() : '';
}

export function parseBooleanQuery(value: unknown): boolean {
  if (value === true || value === 'true' || value === '1') return true;
  return false;
}
