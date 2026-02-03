import { useCallback, useEffect, useRef, useState } from "react";
import { extractErrorMessage } from "../utils/error-messages.js";

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
  // Generation counter: incremented on reset so stale requests are ignored
  const generationRef = useRef(0);
  // Trigger counter: incremented on reset to re-run the fetch effect
  const [fetchTrigger, setFetchTrigger] = useState(0);

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

    const generation = generationRef.current;
    const request = (async () => {
      // Yield to allow React to render the loading state before starting the fetch
      await new Promise((resolve) => setImmediate(resolve));
      try {
        const result = await fetchFn();
        if (generation !== generationRef.current) {
          return;
        }
        setData(result.items);
        setNextCursor(result.nextCursor);
      } catch (err) {
        if (generation !== generationRef.current) {
          return;
        }
        setError(extractErrorMessage(err));
        loadMoreCooldownUntilRef.current = Date.now() + loadMoreCooldownMs;
        throw err;
      } finally {
        if (generation === generationRef.current) {
          setLoading(false);
          initialInFlightRef.current = null;
        }
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

    const generation = generationRef.current;
    // Yield to allow React to render before starting the fetch
    await new Promise((resolve) => setImmediate(resolve));

    try {
      const result = await fetchFn(nextCursor);
      if (generation !== generationRef.current) {
        return;
      }
      setData((prev) => [...prev, ...result.items]);
      setNextCursor(result.nextCursor);
    } catch (err) {
      if (generation !== generationRef.current) {
        return;
      }
      setError(extractErrorMessage(err));
      loadMoreCooldownUntilRef.current = Date.now() + loadMoreCooldownMs;
    } finally {
      if (generation === generationRef.current) {
        setIsPrefetching(false);
        loadMoreInFlightRef.current = false;
      }
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
    // Invalidate any in-flight requests from the previous generation
    generationRef.current += 1;
    setData([]);
    setLoading(true);
    setNextCursor(null);
    setError(undefined);
    loadMoreCooldownUntilRef.current = 0;
    initialInFlightRef.current = null;
    loadMoreInFlightRef.current = false;
    setFetchTrigger((prev) => prev + 1);
  }, [resetKey]);

  // Fetch on mount, when enabled changes, or when resetKey triggers a new generation.
  // fetchTrigger is intentionally included to re-run the effect when resetKey changes
  // even if fetchFn identity hasn't changed.
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchTrigger is an intentional re-fetch trigger
  useEffect(() => {
    fetchInitial().catch(() => {
      // Error is already handled in fetchInitial
    });
  }, [fetchInitial, fetchTrigger]);

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
