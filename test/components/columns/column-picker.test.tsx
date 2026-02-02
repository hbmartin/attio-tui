import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { ColumnPicker } from "../../../source/components/columns/column-picker.js";
import type { ColumnConfig } from "../../../source/schemas/columns-schema.js";
import type { Columns } from "../../../source/types/columns.js";

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

const AVAILABLE_COLUMNS: readonly Columns.Definition[] = [
  {
    attribute: "name",
    label: "Name",
    width: 10,
    value: () => "Name",
  },
  {
    attribute: "email",
    label: "Email",
    width: 12,
    value: () => "Email",
  },
];

const DEFAULT_COLUMNS: readonly ColumnConfig[] = [{ attribute: "name" }];

describe("ColumnPicker", () => {
  it("toggles selection and saves", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    const instance = render(
      <ColumnPicker
        title="Columns: People"
        availableColumns={AVAILABLE_COLUMNS}
        selectedColumns={[{ attribute: "name" }]}
        defaultColumns={DEFAULT_COLUMNS}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    const { send } = prepareStdin(instance);
    const { lastFrame, unmount } = instance;

    try {
      expect(lastFrame()).toContain("[x] Name");
      expect(lastFrame()).toContain("[ ] Email");

      await waitForCondition(
        () => instance.stdin.listenerCount("readable") > 0,
      );

      // Move cursor to Email row
      send("j");
      await waitForCondition(() => {
        const frame = lastFrame() ?? "";
        // Cursor indicator '>' should be on the Email row
        return frame.includes("> [ ] Email") || frame.includes(">  [ ] Email");
      });

      // Toggle Email selection
      send(" ");
      await waitForCondition(() => {
        const frame = lastFrame() ?? "";
        return frame.includes("[x] Email");
      });

      // Save
      send("\r");
      await waitForCondition(() => onSave.mock.calls.length > 0);

      expect(onSave).toHaveBeenCalledWith([
        { attribute: "name" },
        { attribute: "email" },
      ]);
      expect(onClose).toHaveBeenCalled();
    } finally {
      unmount();
    }
  });

  it("resets to defaults", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    const instance = render(
      <ColumnPicker
        title="Columns: People"
        availableColumns={AVAILABLE_COLUMNS}
        selectedColumns={[{ attribute: "name" }, { attribute: "email" }]}
        defaultColumns={DEFAULT_COLUMNS}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    const { send } = prepareStdin(instance);
    const { unmount } = instance;

    try {
      await waitForCondition(
        () => instance.stdin.listenerCount("readable") > 0,
      );

      // Reset to defaults - should uncheck Email
      send("r");
      await waitForCondition(() => {
        const frame = instance.lastFrame() ?? "";
        // Email should now be unchecked after reset
        return frame.includes("[ ] Email");
      });

      // Save
      send("\r");
      await waitForCondition(() => onSave.mock.calls.length > 0);

      expect(onSave).toHaveBeenCalledWith([{ attribute: "name" }]);
    } finally {
      unmount();
    }
  });

  it("saves selections in available order and ignores missing attributes", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    const instance = render(
      <ColumnPicker
        title="Columns: People"
        availableColumns={AVAILABLE_COLUMNS}
        selectedColumns={[
          { attribute: "email" },
          { attribute: "missing" },
          { attribute: "name" },
        ]}
        defaultColumns={DEFAULT_COLUMNS}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    const { send } = prepareStdin(instance);
    const { unmount } = instance;

    try {
      await waitForCondition(
        () => instance.stdin.listenerCount("readable") > 0,
      );

      send("\r");

      await waitForCondition(() => onSave.mock.calls.length > 0);

      expect(onSave).toHaveBeenCalledWith([
        { attribute: "name" },
        { attribute: "email" },
      ]);
    } finally {
      unmount();
    }
  });

  it("saves columns in available order and filters removed attributes", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    const instance = render(
      <ColumnPicker
        title="Columns: People"
        availableColumns={AVAILABLE_COLUMNS}
        selectedColumns={[
          { attribute: "email" },
          { attribute: "name" },
          { attribute: "removed" },
        ]}
        defaultColumns={DEFAULT_COLUMNS}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    const { send } = prepareStdin(instance);
    const { unmount } = instance;

    try {
      await waitForCondition(
        () => instance.stdin.listenerCount("readable") > 0,
      );

      send("\r");

      await waitForCondition(() => onSave.mock.calls.length > 0);

      expect(onSave).toHaveBeenCalledWith([
        { attribute: "name" },
        { attribute: "email" },
      ]);
      expect(onClose).toHaveBeenCalled();
    } finally {
      unmount();
    }
  });
});
