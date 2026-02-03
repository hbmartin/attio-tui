import { promises as fs } from "node:fs";
import { Text } from "ink";
import { render } from "ink-testing-library";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COLUMNS } from "../../source/constants/default-columns.js";
import { useColumns } from "../../source/hooks/use-columns.js";
import {
  type ColumnConfig,
  type ColumnsConfig,
  ColumnsConfigSchema,
} from "../../source/schemas/columns-schema.js";
import type { Columns } from "../../source/types/columns.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

vi.mock("../../source/utils/config-path.js", () => ({
  getConfigDir: () => "/tmp/attio-test",
  getColumnsPath: () => "/tmp/attio-test/columns.json",
}));

interface HookSnapshot {
  readonly columns: ColumnsConfig;
  readonly loading: boolean;
  readonly error: string | undefined;
  readonly saveColumns: (columns: ColumnsConfig) => Promise<void>;
  readonly setColumnsForEntity: (
    entityKey: Columns.EntityKey,
    columns: readonly ColumnConfig[],
  ) => Promise<void>;
}

interface HookHarnessProps {
  readonly onUpdate: (snapshot: HookSnapshot) => void;
}

function HookHarness({ onUpdate }: HookHarnessProps): JSX.Element {
  const snapshot = useColumns();

  useEffect(() => {
    onUpdate(snapshot);
  }, [snapshot, onUpdate]);

  return <Text>{snapshot.loading ? "loading" : "ready"}</Text>;
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

const mockFsAccess = vi.mocked(fs.access);
const mockFsReadFile = vi.mocked(fs.readFile);
const mockFsWriteFile = vi.mocked(fs.writeFile);
const mockFsMkdir = vi.mocked(fs.mkdir);

afterEach(() => {
  vi.clearAllMocks();
});

describe("useColumns", () => {
  it("saves column updates for a single entity", async () => {
    const initialColumns: ColumnsConfig = {
      ...DEFAULT_COLUMNS,
      notes: [{ attribute: "title" }],
    };

    // Mock async fs.promises functions used by the hook
    mockFsAccess.mockResolvedValue(undefined); // File exists
    mockFsReadFile.mockResolvedValue(JSON.stringify(initialColumns));
    mockFsWriteFile.mockResolvedValue(undefined);
    mockFsMkdir.mockResolvedValue(undefined);

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(() => Boolean(latest) && !latest?.loading);

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      await latest.setColumnsForEntity("notes", [
        { attribute: "title" },
        { attribute: "contentPlaintext" },
      ]);

      await waitForCondition(() => {
        const columns = latest?.columns.notes;
        return columns ? columns.length === 2 : false;
      });

      const writeCalls = mockFsWriteFile.mock.calls;
      expect(writeCalls).toHaveLength(1);

      const lastPayload = writeCalls[0]?.[1];
      if (typeof lastPayload !== "string") {
        throw new Error("Expected columns payload to be a string");
      }

      const parsed = ColumnsConfigSchema.safeParse(JSON.parse(lastPayload));
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        throw new Error("Expected columns payload to match schema");
      }

      expect(parsed.data.notes).toEqual([
        { attribute: "title" },
        { attribute: "contentPlaintext" },
      ]);
      expect(parsed.data.webhooks).toEqual(DEFAULT_COLUMNS.webhooks);
    } finally {
      instance.unmount();
    }
  });

  it("sets an error when saving fails", async () => {
    // Mock async fs.promises functions used by the hook
    mockFsAccess.mockRejectedValue(new Error("ENOENT")); // File doesn't exist
    mockFsReadFile.mockResolvedValue(JSON.stringify(DEFAULT_COLUMNS));
    mockFsWriteFile.mockRejectedValue(new Error("Disk full"));
    mockFsMkdir.mockResolvedValue(undefined);

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(() => Boolean(latest) && !latest?.loading);

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      let caught: Error | undefined;

      try {
        await latest.setColumnsForEntity("notes", [{ attribute: "title" }]);
      } catch (err) {
        caught = err instanceof Error ? err : new Error("Unknown error");
      }

      expect(caught?.message).toBe("Disk full");

      await waitForCondition(
        () => latest?.error === "Failed to save columns: Disk full",
      );
    } finally {
      instance.unmount();
    }
  });

  it("clears the error after a successful save", async () => {
    // Mock async fs.promises functions used by the hook
    mockFsAccess.mockRejectedValue(new Error("ENOENT")); // File doesn't exist
    mockFsReadFile.mockResolvedValue(JSON.stringify(DEFAULT_COLUMNS));
    mockFsWriteFile
      .mockRejectedValueOnce(new Error("Disk full"))
      .mockResolvedValue(undefined);
    mockFsMkdir.mockResolvedValue(undefined);

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(() => Boolean(latest) && !latest?.loading);

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      try {
        await latest.setColumnsForEntity("notes", [{ attribute: "title" }]);
      } catch {
        // Expected to throw on the first save attempt.
      }

      await waitForCondition(
        () => latest?.error === "Failed to save columns: Disk full",
      );

      await latest.setColumnsForEntity("notes", [
        { attribute: "contentPlaintext" },
      ]);

      await waitForCondition(() => latest?.error === undefined);
    } finally {
      instance.unmount();
    }
  });
});
