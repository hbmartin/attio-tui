import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { Text } from "ink";
import { render } from "ink-testing-library";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COLUMNS } from "../constants/default-columns.js";
import {
  type ColumnConfig,
  type ColumnsConfig,
  ColumnsConfigSchema,
} from "../schemas/columns-schema.js";
import { useColumns } from "./use-columns.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("../utils/config-path.js", () => ({
  getConfigDir: () => "/tmp/attio-test",
  getColumnsPath: () => "/tmp/attio-test/columns.json",
}));

interface HookSnapshot {
  readonly columns: ColumnsConfig;
  readonly loading: boolean;
  readonly error: string | undefined;
  readonly saveColumns: (columns: ColumnsConfig) => void;
  readonly setColumnsForEntity: (
    entityKey: string,
    columns: readonly ColumnConfig[],
  ) => void;
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

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

afterEach(() => {
  vi.clearAllMocks();
});

describe("useColumns", () => {
  it("saves column updates for a single entity", async () => {
    const initialColumns: ColumnsConfig = {
      ...DEFAULT_COLUMNS,
      notes: [{ attribute: "title" }],
    };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(initialColumns));

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

      latest.setColumnsForEntity("notes", [
        { attribute: "title" },
        { attribute: "contentPlaintext" },
      ]);

      await waitForCondition(() => {
        const columns = latest?.columns["notes"];
        return columns ? columns.length === 2 : false;
      });

      const writeCalls = mockWriteFileSync.mock.calls;
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

      expect(parsed.data["notes"]).toEqual([
        { attribute: "title" },
        { attribute: "contentPlaintext" },
      ]);
      expect(parsed.data["webhooks"]).toEqual(DEFAULT_COLUMNS["webhooks"]);
    } finally {
      instance.unmount();
    }
  });

  it("sets an error when saving fails", async () => {
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue(JSON.stringify(DEFAULT_COLUMNS));
    mockWriteFileSync.mockImplementation(() => {
      throw new Error("Disk full");
    });

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

      latest.setColumnsForEntity("notes", [{ attribute: "title" }]);

      await waitForCondition(
        () => latest?.error === "Failed to save columns: Disk full",
      );
    } finally {
      instance.unmount();
    }
  });
});
