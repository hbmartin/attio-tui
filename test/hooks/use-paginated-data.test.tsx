import { Text } from "ink";
import { render } from "ink-testing-library";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCategoryCache,
  usePaginatedData,
} from "../../source/hooks/use-paginated-data.js";

interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {
    throw new Error("Deferred resolve not initialized");
  };
  let reject: (reason?: unknown) => void = () => {
    throw new Error("Deferred reject not initialized");
  };

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

interface WaitForOptions {
  readonly timeoutMs?: number;
  readonly intervalMs?: number;
}

async function waitForCondition(
  condition: () => boolean,
  options: WaitForOptions = {},
): Promise<void> {
  const { timeoutMs = 2000, intervalMs = 25 } = options;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for hook state to update");
}

interface HookSnapshot {
  readonly data: readonly string[];
  readonly loading: boolean;
  readonly error: string | undefined;
  readonly hasNextPage: boolean;
  readonly lastUpdatedAt: Date | undefined;
  readonly loadMore: () => Promise<void>;
  readonly refresh: () => Promise<void>;
  readonly checkPrefetch: (selectedIndex: number) => void;
}

interface HookOptions {
  readonly enabled?: boolean;
  readonly prefetchThreshold?: number;
  readonly resetKey?: string;
  readonly loadMoreCooldownMs?: number;
}

interface HookHarnessProps {
  readonly fetchFn: (cursor?: string) => Promise<PaginatedResult<string>>;
  readonly onUpdate: (snapshot: HookSnapshot) => void;
  readonly options?: HookOptions;
}

function HookHarness({
  fetchFn,
  onUpdate,
  options,
}: HookHarnessProps): JSX.Element {
  const snapshot = usePaginatedData<string>({ fetchFn, ...options });

  useEffect(() => {
    onUpdate(snapshot);
  }, [snapshot, onUpdate]);

  return <Text>{snapshot.data.join("|")}</Text>;
}

describe("usePaginatedData", () => {
  beforeEach(() => {
    clearCategoryCache();
  });

  it("prefetches when selection nears the end of the list", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        items: ["alpha", "beta", "gamma"],
        nextCursor: "next",
      })
      .mockResolvedValueOnce({ items: ["delta"], nextCursor: null });

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        fetchFn={fetchFn}
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(
        () => Boolean(latest) && latest?.data.length === 3,
      );

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      latest.checkPrefetch(2);

      await waitForCondition(() => latest?.data.length === 4);

      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(latest.data[3]).toBe("delta");
      expect(latest.hasNextPage).toBe(false);
    } finally {
      instance.cleanup();
    }
  });
  it("prevents overlapping loadMore requests", async () => {
    const deferred = createDeferred<PaginatedResult<string>>();
    let callCount = 0;

    const fetchFn = vi.fn((cursor?: string) => {
      callCount += 1;

      if (callCount === 1) {
        return Promise.resolve({ items: ["alpha"], nextCursor: "next" });
      }

      expect(cursor).toBe("next");
      return deferred.promise;
    });

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        fetchFn={fetchFn}
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(
        () => Boolean(latest) && latest?.data.length === 1,
      );

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      const firstLoad = latest.loadMore();
      const secondLoad = latest.loadMore();

      // Wait for the async yield before the fetch starts
      await waitForCondition(() => fetchFn.mock.calls.length >= 2);

      expect(fetchFn).toHaveBeenCalledTimes(2);

      deferred.resolve({ items: ["beta"], nextCursor: null });
      await Promise.all([firstLoad, secondLoad]);

      await waitForCondition(() => latest?.data.length === 2);

      expect(latest.data[1]).toBe("beta");
      expect(latest.hasNextPage).toBe(false);
    } finally {
      instance.cleanup();
    }
  });

  it("rejects refresh when the fetch fails", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ items: ["alpha"], nextCursor: null })
      .mockRejectedValueOnce(new Error("Boom"));

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        fetchFn={fetchFn}
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(
        () => Boolean(latest) && latest?.data.length === 1,
      );

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      await expect(latest.refresh()).rejects.toThrow("Boom");

      await waitForCondition(() => latest?.error === "Boom");

      expect(latest.data).toHaveLength(1);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    } finally {
      instance.cleanup();
    }
  });

  it("deduplicates refresh when the initial request is still in flight", async () => {
    const deferred = createDeferred<PaginatedResult<string>>();
    const fetchFn = vi.fn().mockReturnValue(deferred.promise);

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        fetchFn={fetchFn}
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      // Wait for the initial fetch to start (after setImmediate yield)
      await waitForCondition(() => fetchFn.mock.calls.length > 0);

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      const refreshPromise = latest.refresh();

      // The initial fetch is still in flight, so refresh should reuse it
      expect(fetchFn).toHaveBeenCalledTimes(1);

      deferred.resolve({ items: ["alpha"], nextCursor: null });
      await refreshPromise;

      await waitForCondition(() => latest?.data.length === 1);
    } finally {
      instance.cleanup();
    }
  });

  it("cooldowns refresh after an initial error", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("Boom"));

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        fetchFn={fetchFn}
        options={{ loadMoreCooldownMs: 10_000 }}
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(() => latest?.error === "Boom");

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      await latest.refresh();

      expect(fetchFn).toHaveBeenCalledTimes(1);
    } finally {
      instance.cleanup();
    }
  });

  it("ignores stale request when resetKey changes during in-flight fetch", async () => {
    const oldDeferred = createDeferred<PaginatedResult<string>>();
    const newDeferred = createDeferred<PaginatedResult<string>>();
    let callCount = 0;

    const fetchFn = vi.fn(() => {
      callCount += 1;
      if (callCount === 1) {
        return oldDeferred.promise;
      }
      return newDeferred.promise;
    });

    let setKey: (key: string) => void = () => {
      throw new Error("setKey not initialized");
    };
    let latest: HookSnapshot | undefined;

    function ResetKeyHarness(): JSX.Element {
      const [resetKey, setResetKey] = useState("key-a");
      setKey = setResetKey;

      const snapshot = usePaginatedData<string>({ fetchFn, resetKey });

      useEffect(() => {
        latest = snapshot;
      }, [snapshot]);

      return (
        <Text>
          {snapshot.loading ? "loading" : "idle"}|{snapshot.data.join(",")}
        </Text>
      );
    }

    const instance = render(<ResetKeyHarness />);

    try {
      // Wait for the first fetch to start
      await waitForCondition(() => fetchFn.mock.calls.length > 0);

      // Change resetKey while the old fetch is still in flight
      setKey("key-b");

      // Wait for the new fetch to start
      await waitForCondition(() => fetchFn.mock.calls.length >= 2);

      // Resolve the OLD request - its state updates should be ignored
      oldDeferred.resolve({ items: ["stale-data"], nextCursor: null });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Loading should still be true because only the new request matters
      expect(latest?.loading).toBe(true);
      expect(latest?.data).toHaveLength(0);

      // Resolve the NEW request
      newDeferred.resolve({ items: ["fresh-data"], nextCursor: null });

      await waitForCondition(() => latest?.data.length === 1);

      expect(latest?.data[0]).toBe("fresh-data");
      expect(latest?.loading).toBe(false);
    } finally {
      instance.cleanup();
    }
  });

  it("cooldowns loadMore after an error", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ items: ["alpha"], nextCursor: "next" })
      .mockRejectedValueOnce(new Error("Boom"));

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        fetchFn={fetchFn}
        options={{ prefetchThreshold: 1, loadMoreCooldownMs: 10_000 }}
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(
        () => Boolean(latest) && latest?.data.length === 1,
      );

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      latest.checkPrefetch(0);
      await waitForCondition(() => latest?.error === "Boom");

      const callsAfterError = fetchFn.mock.calls.length;
      latest.checkPrefetch(0);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(fetchFn).toHaveBeenCalledTimes(callsAfterError);
    } finally {
      instance.cleanup();
    }
  });

  it("sets lastUpdatedAt after a successful fetch", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ items: ["alpha"], nextCursor: null });

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        fetchFn={fetchFn}
        options={{ resetKey: "test-updated" }}
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(
        () => Boolean(latest) && latest?.data.length === 1,
      );

      expect(latest?.lastUpdatedAt).toBeInstanceOf(Date);
    } finally {
      instance.cleanup();
    }
  });

  it("restores cached data when switching back to a previously loaded resetKey", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ items: ["alpha"], nextCursor: null })
      .mockResolvedValueOnce({ items: ["beta"], nextCursor: null });

    let setKey: (key: string) => void = () => {
      throw new Error("setKey not initialized");
    };
    let latest: HookSnapshot | undefined;

    function CacheHarness(): JSX.Element {
      const [resetKey, setResetKey] = useState("key-a");
      setKey = setResetKey;

      const snapshot = usePaginatedData<string>({ fetchFn, resetKey });

      useEffect(() => {
        latest = snapshot;
      }, [snapshot]);

      return (
        <Text>
          {snapshot.loading ? "loading" : "idle"}|{snapshot.data.join(",")}
        </Text>
      );
    }

    const instance = render(<CacheHarness />);

    try {
      // Wait for key-a to load
      await waitForCondition(
        () => Boolean(latest) && latest?.data.length === 1 && !latest?.loading,
      );
      expect(latest?.data[0]).toBe("alpha");
      const firstFetchedAt = latest?.lastUpdatedAt;
      expect(firstFetchedAt).toBeInstanceOf(Date);

      // Switch to key-b
      setKey("key-b");
      await waitForCondition(
        () =>
          Boolean(latest) &&
          latest?.data.length === 1 &&
          latest?.data[0] === "beta",
      );
      expect(fetchFn).toHaveBeenCalledTimes(2);

      // Switch back to key-a — should restore from cache without a new fetch
      setKey("key-a");
      await waitForCondition(
        () =>
          Boolean(latest) &&
          latest?.data.length === 1 &&
          latest?.data[0] === "alpha",
      );
      expect(fetchFn).toHaveBeenCalledTimes(2); // No new fetch
      expect(latest?.loading).toBe(false);
      expect(latest?.lastUpdatedAt).toEqual(firstFetchedAt);
    } finally {
      instance.cleanup();
    }
  });

  it("refresh overwrites cache and updates lastUpdatedAt", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ items: ["alpha"], nextCursor: null })
      .mockResolvedValueOnce({ items: ["alpha-refreshed"], nextCursor: null });

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        fetchFn={fetchFn}
        options={{ resetKey: "refresh-test" }}
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(
        () => Boolean(latest) && latest?.data.length === 1 && !latest?.loading,
      );

      const firstFetchedAt = latest?.lastUpdatedAt;
      expect(firstFetchedAt).toBeInstanceOf(Date);

      // Small delay to ensure a different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await latest?.refresh();

      await waitForCondition(
        () => latest?.data[0] === "alpha-refreshed" && !latest?.loading,
      );

      expect(latest?.lastUpdatedAt).toBeInstanceOf(Date);
      expect(latest?.lastUpdatedAt?.getTime()).toBeGreaterThanOrEqual(
        firstFetchedAt?.getTime() ?? 0,
      );
      expect(fetchFn).toHaveBeenCalledTimes(2);
    } finally {
      instance.cleanup();
    }
  });

  it("cache includes loadMore data with original fetchedAt", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ items: ["alpha"], nextCursor: "next" })
      .mockResolvedValueOnce({ items: ["beta"], nextCursor: null })
      // key-b fetch
      .mockResolvedValueOnce({ items: ["gamma"], nextCursor: null });

    let setKey: (key: string) => void = () => {
      throw new Error("setKey not initialized");
    };
    let latest: HookSnapshot | undefined;

    function LoadMoreCacheHarness(): JSX.Element {
      const [resetKey, setResetKey] = useState("key-a");
      setKey = setResetKey;

      const snapshot = usePaginatedData<string>({ fetchFn, resetKey });

      useEffect(() => {
        latest = snapshot;
      }, [snapshot]);

      return (
        <Text>
          {snapshot.loading ? "loading" : "idle"}|{snapshot.data.join(",")}
        </Text>
      );
    }

    const instance = render(<LoadMoreCacheHarness />);

    try {
      // Wait for initial fetch
      await waitForCondition(
        () => Boolean(latest) && latest?.data.length === 1 && !latest?.loading,
      );
      const originalFetchedAt = latest?.lastUpdatedAt;

      // Load more
      await latest?.loadMore();
      await waitForCondition(() => latest?.data.length === 2);
      expect(latest?.data).toEqual(["alpha", "beta"]);
      // lastUpdatedAt should be preserved from initial fetch
      expect(latest?.lastUpdatedAt).toEqual(originalFetchedAt);

      // Switch to key-b
      setKey("key-b");
      await waitForCondition(
        () => latest?.data[0] === "gamma" && !latest?.loading,
      );

      // Switch back to key-a — should restore both pages from cache
      setKey("key-a");
      await waitForCondition(
        () => latest?.data.length === 2 && latest?.data[0] === "alpha",
      );
      expect(latest?.data).toEqual(["alpha", "beta"]);
      expect(latest?.loading).toBe(false);
      expect(latest?.lastUpdatedAt).toEqual(originalFetchedAt);
    } finally {
      instance.cleanup();
    }
  });

  it("resets isPrefetching when resetKey changes during in-flight loadMore", async () => {
    const loadMoreDeferred = createDeferred<PaginatedResult<string>>();
    let callCount = 0;

    const fetchFn = vi.fn((_cursor?: string) => {
      callCount += 1;
      // Call 1: initial fetch for key-a
      if (callCount === 1) {
        return Promise.resolve({
          items: ["alpha"],
          nextCursor: "cursor-a",
        });
      }
      // Call 2: loadMore for key-a (will be deferred)
      if (callCount === 2) {
        return loadMoreDeferred.promise;
      }
      // Call 3: initial fetch for key-b (with its own next page)
      if (callCount === 3) {
        return Promise.resolve({
          items: ["beta"],
          nextCursor: "cursor-b",
        });
      }
      // Call 4: loadMore for key-b (proves isPrefetching was reset)
      return Promise.resolve({
        items: ["gamma"],
        nextCursor: null,
      });
    });

    let setKey: (key: string) => void = () => {
      throw new Error("setKey not initialized");
    };
    let latest: HookSnapshot | undefined;

    function ResetPrefetchHarness(): JSX.Element {
      const [resetKey, setResetKey] = useState("key-a");
      setKey = setResetKey;

      const snapshot = usePaginatedData<string>({ fetchFn, resetKey });

      useEffect(() => {
        latest = snapshot;
      }, [snapshot]);

      return (
        <Text>
          {snapshot.loading ? "loading" : "idle"}|{snapshot.data.join(",")}
        </Text>
      );
    }

    const instance = render(<ResetPrefetchHarness />);

    try {
      // Wait for initial fetch of key-a
      await waitForCondition(
        () => Boolean(latest) && latest?.data.length === 1 && !latest?.loading,
      );
      expect(latest?.data[0]).toBe("alpha");

      // Start loadMore (sets isPrefetching = true)
      const loadMorePromise = latest?.loadMore();

      // Wait for the loadMore fetch to start
      await waitForCondition(() => fetchFn.mock.calls.length >= 2);

      // Change resetKey while loadMore is still in flight
      setKey("key-b");

      // Wait for key-b's initial data to load
      await waitForCondition(
        () => latest?.data[0] === "beta" && !latest?.loading,
      );

      // Resolve the stale loadMore — its results should be ignored
      loadMoreDeferred.resolve({ items: ["stale"], nextCursor: null });
      await loadMorePromise;

      // The critical assertion: loadMore should work for key-b
      // (this would hang if isPrefetching was stuck as true)
      await latest?.loadMore();

      await waitForCondition(() => latest?.data.length === 2);

      expect(latest?.data).toEqual(["beta", "gamma"]);
    } finally {
      instance.cleanup();
    }
  });

  it("clearCategoryCache removes all cached entries", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ items: ["alpha"], nextCursor: null })
      .mockResolvedValueOnce({ items: ["alpha-fresh"], nextCursor: null });

    let setKey: (key: string) => void = () => {
      throw new Error("setKey not initialized");
    };
    let latest: HookSnapshot | undefined;

    function ClearCacheHarness(): JSX.Element {
      const [resetKey, setResetKey] = useState("key-a");
      setKey = setResetKey;

      const snapshot = usePaginatedData<string>({ fetchFn, resetKey });

      useEffect(() => {
        latest = snapshot;
      }, [snapshot]);

      return (
        <Text>
          {snapshot.loading ? "loading" : "idle"}|{snapshot.data.join(",")}
        </Text>
      );
    }

    const instance = render(<ClearCacheHarness />);

    try {
      // Wait for initial fetch
      await waitForCondition(
        () => Boolean(latest) && latest?.data.length === 1 && !latest?.loading,
      );
      expect(latest?.data[0]).toBe("alpha");

      // Clear the cache
      clearCategoryCache();

      // Force a resetKey change and back to trigger cache miss
      setKey("key-temp");
      // Immediately switch back before key-temp finishes
      await new Promise((resolve) => setTimeout(resolve, 10));
      setKey("key-a");

      await waitForCondition(
        () =>
          latest?.data[0] === "alpha-fresh" &&
          !latest?.loading &&
          latest?.data.length === 1,
      );
      // A new fetch was required because cache was cleared
      expect(latest?.data[0]).toBe("alpha-fresh");
    } finally {
      instance.cleanup();
    }
  });
});
