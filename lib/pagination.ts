export type PaginationMeta = {
  total: number
  page: number
  pages: number
  limit: number
}

type PaginationInput = {
  pagination?: Partial<PaginationMeta>
  total?: number
  page?: number
  pages?: number
  limit?: number
  totalPages?: number
}

export function resolvePagination(
  input: PaginationInput | null | undefined,
  fallbackLimit = 20,
): PaginationMeta {
  const total = Number(input?.pagination?.total ?? input?.total ?? 0) || 0
  const page = Math.max(Number(input?.pagination?.page ?? input?.page ?? 1) || 1, 1)
  const limit = Math.max(Number(input?.pagination?.limit ?? input?.limit ?? fallbackLimit) || fallbackLimit, 1)
  const explicitPages = Number(input?.pagination?.pages ?? input?.pages ?? input?.totalPages ?? 0) || 0
  const derivedPages = Math.max(Math.ceil(total / limit), 1)

  return {
    total,
    page,
    pages: Math.max(explicitPages || derivedPages, 1),
    limit,
  }
}
