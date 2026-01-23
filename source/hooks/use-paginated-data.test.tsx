import { Text } from "ink";
import { render } from "ink-testing-library";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { usePaginatedData } from "./use-paginated-data.js";

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
}

interface HookHarnessProps {
  readonly fetchFn: (cursor?: string) => Promise<PaginatedResult<string>>;
  readonly onUpdate: (snapshot: HookSnapshot) => void;
}

function HookHarness({ fetchFn, onUpdate }: HookHarnessProps): JSX.Element {
  const snapshot = usePaginatedData<string>({ fetchFn });

  useEffect(() => {
    onUpdate(snapshot);
  }, [snapshot, onUpdate]);

  return <Text>{snapshot.data.join("|")}</Text>;
}

describe("usePaginatedData", () => {
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

      expect(latest.data).toHaveLength(0);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    } finally {
      instance.cleanup();
    }
  });
});
