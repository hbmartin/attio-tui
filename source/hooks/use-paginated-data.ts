import { useCallback, useEffect, useRef, useState } from "react";

interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

interface UsePaginatedDataOptions<T> {
  readonly fetchFn: (cursor?: string) => Promise<PaginatedResult<T>>;
  readonly enabled?: boolean;
  readonly prefetchThreshold?: number;
  readonly resetKey?: string;
  readonly loadMoreCooldownMs?: number;
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
  resetKey,
  loadMoreCooldownMs = 1500,
}: UsePaginatedDataOptions<T>): UsePaginatedDataResult<T> {
  const [data, setData] = useState<readonly T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const loadMoreInFlightRef = useRef(false);
  const initialInFlightRef = useRef<Promise<void> | null>(null);
  const resetKeyRef = useRef(resetKey);
  const loadMoreCooldownUntilRef = useRef(0);

  // Initial fetch
  const fetchInitial = useCallback(async () => {
    if (!enabled) {
      return;
    }
    if (Date.now() < loadMoreCooldownUntilRef.current) {
      return;
    }
    if (initialInFlightRef.current) {
      await initialInFlightRef.current;
      return;
    }

    setLoading(true);
    setError(undefined);

    const request = (async () => {
      try {
        const result = await fetchFn();
        setData(result.items);
        setNextCursor(result.nextCursor);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        loadMoreCooldownUntilRef.current = Date.now() + loadMoreCooldownMs;
        throw err;
      } finally {
        setLoading(false);
        initialInFlightRef.current = null;
      }
    })();

    initialInFlightRef.current = request;
    await request;
  }, [fetchFn, enabled, loadMoreCooldownMs]);

  // Load more data
  const loadMore = useCallback(async () => {
    if (Date.now() < loadMoreCooldownUntilRef.current) {
      return;
    }
    if (
      !nextCursor ||
      loading ||
      isPrefetching ||
      loadMoreInFlightRef.current
    ) {
      return;
    }

    setIsPrefetching(true);
    loadMoreInFlightRef.current = true;

    try {
      const result = await fetchFn(nextCursor);
      setData((prev) => [...prev, ...result.items]);
      setNextCursor(result.nextCursor);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      loadMoreCooldownUntilRef.current = Date.now() + loadMoreCooldownMs;
    } finally {
      setIsPrefetching(false);
      loadMoreInFlightRef.current = false;
    }
  }, [fetchFn, nextCursor, loading, isPrefetching, loadMoreCooldownMs]);

  // Refresh data (start from beginning)
  const refresh = useCallback(async () => {
    setError(undefined);
    await fetchInitial();
  }, [fetchInitial]);

  // Check if we should prefetch based on selected index
  const checkPrefetch = useCallback(
    (selectedIndex: number) => {
      const itemsRemaining = data.length - selectedIndex - 1;
      if (Date.now() < loadMoreCooldownUntilRef.current) {
        return;
      }
      if (itemsRemaining <= prefetchThreshold && nextCursor && !isPrefetching) {
        loadMore().catch(() => {
          // Error is already handled in loadMore
        });
      }
    },
    [data.length, prefetchThreshold, nextCursor, isPrefetching, loadMore],
  );

  useEffect(() => {
    if (resetKeyRef.current === resetKey) {
      return;
    }
    resetKeyRef.current = resetKey;
    setData([]);
    setNextCursor(null);
    setError(undefined);
    loadMoreCooldownUntilRef.current = 0;
    initialInFlightRef.current = null;
    loadMoreInFlightRef.current = false;
  }, [resetKey]);

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
