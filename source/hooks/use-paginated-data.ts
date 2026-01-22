import { useCallback, useEffect, useState } from "react";

interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

interface UsePaginatedDataOptions<T> {
  readonly fetchFn: (cursor?: string) => Promise<PaginatedResult<T>>;
  readonly enabled?: boolean;
  readonly prefetchThreshold?: number;
}

interface UsePaginatedDataResult<T> {
  readonly data: readonly T[];
  readonly loading: boolean;
  readonly error: string | undefined;
  readonly hasNextPage: boolean;
  readonly loadMore: () => Promise<void>;
  readonly refresh: () => Promise<void>;
  readonly checkPrefetch: (selectedIndex: number) => void;
}

export function usePaginatedData<T>({
  fetchFn,
  enabled = true,
  prefetchThreshold = 5,
}: UsePaginatedDataOptions<T>): UsePaginatedDataResult<T> {
  const [data, setData] = useState<readonly T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);

  // Initial fetch
  const fetchInitial = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const result = await fetchFn();
      setData(result.items);
      setNextCursor(result.nextCursor);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, enabled]);

  // Load more data
  const loadMore = useCallback(async () => {
    if (!nextCursor || loading || isPrefetching) {
      return;
    }

    setIsPrefetching(true);

    try {
      const result = await fetchFn(nextCursor);
      setData((prev) => [...prev, ...result.items]);
      setNextCursor(result.nextCursor);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsPrefetching(false);
    }
  }, [fetchFn, nextCursor, loading, isPrefetching]);

  // Refresh data (start from beginning)
  const refresh = useCallback(async () => {
    setData([]);
    setNextCursor(null);
    await fetchInitial();
  }, [fetchInitial]);

  // Check if we should prefetch based on selected index
  const checkPrefetch = useCallback(
    (selectedIndex: number) => {
      const itemsRemaining = data.length - selectedIndex - 1;
      if (itemsRemaining <= prefetchThreshold && nextCursor && !isPrefetching) {
        loadMore().catch(() => {
          // Error is already handled in loadMore
        });
      }
    },
    [data.length, prefetchThreshold, nextCursor, isPrefetching, loadMore],
  );

  // Fetch on mount and when enabled changes
  useEffect(() => {
    fetchInitial().catch(() => {
      // Error is already handled in fetchInitial
    });
  }, [fetchInitial]);

  return {
    data,
    loading,
    error,
    hasNextPage: Boolean(nextCursor),
    loadMore,
    refresh,
    checkPrefetch,
  };
}
