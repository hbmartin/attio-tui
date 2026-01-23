/**
 * Parses a cursor string as an offset number.
 *
 * @param cursor - The cursor string to parse (typically a stringified offset)
 * @returns The parsed offset number, or undefined if the cursor is invalid
 *
 * A cursor is considered valid if:
 * - It's a non-empty string
 * - It parses to a finite integer
 * - The resulting integer is non-negative
 */
export function parseCursorOffset(
  cursor: string | undefined,
): number | undefined {
  if (cursor === undefined || cursor === "") {
    return;
  }

  const parsed = Number.parseInt(cursor, 10);

  if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return;
  }

  return parsed;
}

export interface OffsetPaginationRequest {
  readonly limit: number;
  readonly offset: number | undefined;
  readonly requestLimit: number;
}

export interface OffsetPaginationRequestOptions {
  readonly limit?: number;
  readonly cursor?: string;
  readonly defaultLimit?: number;
}

export interface OffsetPaginationResult<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

export interface OffsetPaginationResponseOptions<T> {
  readonly error: unknown | undefined;
  readonly data: readonly T[] | undefined;
  readonly pagination: OffsetPaginationRequest;
  readonly errorMessage: string;
}

export function buildOffsetPaginationRequest(
  options: OffsetPaginationRequestOptions,
): OffsetPaginationRequest {
  const { limit, cursor, defaultLimit = 25 } = options;
  const offset = parseCursorOffset(cursor);
  const effectiveLimit = Math.max(1, Number(limit) || defaultLimit);

  return {
    limit: effectiveLimit,
    offset,
    requestLimit: effectiveLimit + 1,
  };
}

export function finalizeOffsetPagination<T>({
  data,
  limit,
  offset,
}: {
  readonly data: readonly T[];
  readonly limit: number;
  readonly offset: number | undefined;
}): OffsetPaginationResult<T> {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const currentOffset = offset ?? 0;
  const nextCursor = hasMore ? String(currentOffset + limit) : null;

  return {
    items,
    nextCursor,
  };
}

export function resolveOffsetPagination<T>({
  error,
  data,
  pagination,
  errorMessage,
}: OffsetPaginationResponseOptions<T>): OffsetPaginationResult<T> {
  if (error) {
    throw new Error(`${errorMessage}: ${JSON.stringify(error)}`);
  }

  return finalizeOffsetPagination({
    data: data ?? [],
    limit: pagination.limit,
    offset: pagination.offset,
  });
}
