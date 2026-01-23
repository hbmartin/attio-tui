import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./command-palette.js";

type RenderInstance = ReturnType<typeof render>;

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

  throw new Error("Timed out waiting for component update");
}

async function flushUpdates(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

interface PreparedStdin {
  readonly send: (data: string) => void;
}

function prepareStdin(instance: RenderInstance): PreparedStdin {
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

describe("CommandPalette", () => {
  it("accumulates rapid input without relying on prop updates", async () => {
    const onQueryChange = vi.fn();

    const instance = render(
      <CommandPalette
        isOpen={true}
        query=""
        commands={[]}
        selectedIndex={0}
        onQueryChange={onQueryChange}
      />,
    );
    const { send } = prepareStdin(instance);
    const { unmount } = instance;

    try {
      await waitForCondition(
        () => instance.stdin.listenerCount("readable") > 0,
      );

      send("a");
      await flushUpdates();
      send("b");
      await flushUpdates();

      expect(onQueryChange).toHaveBeenNthCalledWith(1, "a");
      expect(onQueryChange).toHaveBeenNthCalledWith(2, "ab");
    } finally {
      unmount();
    }
  });

  it("syncs with externally updated query before typing", async () => {
    const onQueryChange = vi.fn();

    const instance = render(
      <CommandPalette
        isOpen={true}
        query="cat"
        commands={[]}
        selectedIndex={0}
        onQueryChange={onQueryChange}
      />,
    );
    const { send } = prepareStdin(instance);
    const { rerender, unmount } = instance;

    try {
      await waitForCondition(
        () => instance.stdin.listenerCount("readable") > 0,
      );

      rerender(
        <CommandPalette
          isOpen={true}
          query="cats"
          commands={[]}
          selectedIndex={0}
          onQueryChange={onQueryChange}
        />,
      );
      await flushUpdates();

      send("!");
      await flushUpdates();

      expect(onQueryChange).toHaveBeenCalledTimes(1);
      expect(onQueryChange).toHaveBeenCalledWith("cats!");
    } finally {
      unmount();
    }
  });
});
