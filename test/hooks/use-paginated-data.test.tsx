import { Text } from "ink";
import { render } from "ink-testing-library";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { usePaginatedData } from "../../source/hooks/use-paginated-data.js";

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
      await waitForCondition(() => Boolean(latest));

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      const refreshPromise = latest.refresh();

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

  it("preserves error when refresh is throttled", async () => {
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

      // Error should still be present since fetch was throttled
      expect(latest.error).toBe("Boom");
      expect(fetchFn).toHaveBeenCalledTimes(1);
    } finally {
      instance.cleanup();
    }
  });

  it("ignores stale initial fetch response after reset", async () => {
    const deferred = createDeferred<PaginatedResult<string>>();

    // First fetchFn: slow, will become stale
    const staleFetchFn = vi.fn(() => deferred.promise);
    // Second fetchFn: fast, used after reset
    const freshFetchFn = vi.fn(() =>
      Promise.resolve({ items: ["fresh"], nextCursor: null }),
    );

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        fetchFn={staleFetchFn}
        options={{ resetKey: "a" }}
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(() => Boolean(latest) && latest?.loading === true);

      // Reset with a new fetchFn while the first fetch is still in flight
      instance.rerender(
        <HookHarness
          fetchFn={freshFetchFn}
          options={{ resetKey: "b" }}
          onUpdate={(snapshot) => {
            latest = snapshot;
          }}
        />,
      );

      // Wait for the post-reset fetch to complete
      await waitForCondition(() => latest?.data.length === 1);

      expect(latest?.data[0]).toBe("fresh");

      // Now resolve the stale first request — should be ignored
      deferred.resolve({ items: ["stale"], nextCursor: null });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Data should still be "fresh", not overwritten by "stale"
      expect(latest?.data).toEqual(["fresh"]);
    } finally {
      instance.cleanup();
    }
  });

  it("ignores stale loadMore response after reset", async () => {
    const deferred = createDeferred<PaginatedResult<string>>();

    // Initial fetchFn: returns data with a next page, then a slow loadMore
    const initialFetchFn = vi
      .fn()
      .mockResolvedValueOnce({ items: ["alpha"], nextCursor: "next" })
      .mockReturnValueOnce(deferred.promise);

    // Post-reset fetchFn
    const freshFetchFn = vi.fn(() =>
      Promise.resolve({ items: ["fresh"], nextCursor: null }),
    );

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        fetchFn={initialFetchFn}
        options={{ resetKey: "a" }}
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

      // Start a loadMore that won't resolve yet
      const loadMorePromise = latest.loadMore();

      // Reset with a new fetchFn while loadMore is in flight
      instance.rerender(
        <HookHarness
          fetchFn={freshFetchFn}
          options={{ resetKey: "b" }}
          onUpdate={(snapshot) => {
            latest = snapshot;
          }}
        />,
      );

      // Wait for the post-reset initial fetch to complete
      await waitForCondition(
        () => latest?.data.length === 1 && latest?.data[0] === "fresh",
      );

      // Resolve the stale loadMore — should be ignored
      deferred.resolve({ items: ["stale-extra"], nextCursor: null });
      await loadMorePromise;
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Data should still be just "fresh"
      expect(latest?.data).toEqual(["fresh"]);
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
});
