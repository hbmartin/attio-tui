import type { render } from "ink-testing-library";

type RenderInstance = ReturnType<typeof render>;

export interface PreparedStdin {
  readonly send: (data: string) => void;
}

/**
 * Prepares the stdin mock for ink-testing-library with keyboard input support.
 * This is required for components that use useInput.
 *
 * @example
 * ```ts
 * const instance = render(<MyComponent />);
 * const { send } = prepareStdin(instance);
 * send("q"); // Send 'q' key
 * ```
 */
export function prepareStdin(instance: RenderInstance): PreparedStdin {
  const queue: Buffer[] = [];

  Object.assign(instance.stdin, {
    ref: () => undefined,
    unref: () => undefined,
    read: () => queue.shift() ?? null,
  });

  return {
    send: (data: string) => {
      queue.push(Buffer.from(data));
      instance.stdin.emit("readable");
    },
  };
}

/**
 * Flushes pending React/Ink state updates by yielding to the event loop.
 *
 * @example
 * ```ts
 * send("q");
 * await flushUpdates();
 * expect(onClose).toHaveBeenCalled();
 * ```
 */
export async function flushUpdates(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export interface WaitForConditionOptions {
  readonly timeoutMs?: number;
  readonly intervalMs?: number;
}

/**
 * Waits for a condition to become true, polling at regular intervals.
 * Throws an error if the condition is not met within the timeout.
 *
 * @param condition - Function that returns true when the condition is met
 * @param options - Configuration for timeout and polling interval
 *
 * @example
 * ```ts
 * await waitForCondition(
 *   () => instance.stdin.listenerCount("readable") > 0,
 *   { timeoutMs: 2000 }
 * );
 * ```
 */
export async function waitForCondition(
  condition: () => boolean,
  options: WaitForConditionOptions = {},
): Promise<void> {
  const { timeoutMs = 2000, intervalMs = 25 } = options;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for component update");
}
