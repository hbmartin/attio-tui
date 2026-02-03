import fs from "node:fs/promises";
import { Text } from "ink";
import { render } from "ink-testing-library";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useConfig } from "../../source/hooks/use-config.js";
import type { AppConfig } from "../../source/schemas/config-schema.js";
import {
  DEFAULT_CONFIG,
  parseConfig,
} from "../../source/schemas/config-schema.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// use-config.ts imports from node:fs/promises directly
vi.mock("node:fs/promises", () => ({
  default: {
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

vi.mock("../../source/utils/config-path.js", () => ({
  getConfigDir: () => "/tmp/attio-test",
  getConfigPath: () => "/tmp/attio-test/config.json",
}));

interface HookSnapshot {
  readonly config: AppConfig;
  readonly loading: boolean;
  readonly error: string | undefined;
  readonly saveConfig: (config: Partial<AppConfig>) => void;
  readonly setApiKey: (apiKey: string) => void;
}

interface HookHarnessProps {
  readonly onUpdate: (snapshot: HookSnapshot) => void;
}

function HookHarness({ onUpdate }: HookHarnessProps): JSX.Element {
  const snapshot = useConfig();

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

describe("useConfig", () => {
  it("writes merged config updates using the latest config snapshot", async () => {
    const initialConfig: AppConfig = {
      apiKey: "test-api-key-123",
      baseUrl: "https://api.initial.test",
      debugEnabled: true,
    };

    // Mock async fs.promises functions used by the hook
    mockFsAccess.mockResolvedValue(undefined); // File exists
    mockFsReadFile.mockResolvedValue(JSON.stringify(initialConfig));
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

      latest.saveConfig({ baseUrl: "https://api.next.test" });

      await waitForCondition(
        () => latest?.config.baseUrl === "https://api.next.test",
      );

      // Wait for the async write to complete
      await waitForCondition(() => mockFsWriteFile.mock.calls.length > 0);

      latest.saveConfig({ debugEnabled: false });

      await waitForCondition(() => latest?.config.debugEnabled === false);

      // Wait for both writes to complete
      await waitForCondition(() => mockFsWriteFile.mock.calls.length >= 2);

      const writeCalls = mockFsWriteFile.mock.calls;
      expect(writeCalls).toHaveLength(2);

      const lastPayload = writeCalls[1]?.[1];
      if (typeof lastPayload !== "string") {
        throw new Error("Expected config payload to be a string");
      }

      const savedConfig = parseConfig(JSON.parse(lastPayload));
      expect(savedConfig).toEqual({
        ...initialConfig,
        baseUrl: "https://api.next.test",
        debugEnabled: false,
      });
    } finally {
      instance.unmount();
    }
  });

  it("sets an error when saving fails", async () => {
    // Mock async fs.promises functions used by the hook
    mockFsAccess.mockRejectedValue(new Error("ENOENT")); // File doesn't exist
    mockFsReadFile.mockResolvedValue(JSON.stringify(DEFAULT_CONFIG));
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

      latest.saveConfig({ apiKey: "test-api-key-456" });

      await waitForCondition(
        () => latest?.error === "Failed to save config: Disk full",
      );
    } finally {
      instance.unmount();
    }
  });

  it("clears error after a successful save following a failed one", async () => {
    mockFsAccess.mockRejectedValue(new Error("ENOENT"));
    mockFsReadFile.mockResolvedValue(JSON.stringify(DEFAULT_CONFIG));
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

      // Trigger a failing save
      latest.saveConfig({ apiKey: "fail-key" });
      await waitForCondition(
        () => latest?.error === "Failed to save config: Disk full",
      );

      // Now make the next save succeed
      mockFsWriteFile.mockResolvedValue(undefined);
      latest.saveConfig({ apiKey: "success-key" });

      // Error should be cleared after successful save
      await waitForCondition(() => latest?.error === undefined);
      expect(latest?.error).toBeUndefined();
    } finally {
      instance.unmount();
    }
  });
});
