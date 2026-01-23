import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

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

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(initialConfig));

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

      latest.saveConfig({ debugEnabled: false });

      await waitForCondition(() => latest?.config.debugEnabled === false);

      const writeCalls = mockWriteFileSync.mock.calls;
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
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue(JSON.stringify(DEFAULT_CONFIG));
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

      latest.saveConfig({ apiKey: "test-api-key-456" });

      await waitForCondition(
        () => latest?.error === "Failed to save config: Disk full",
      );
    } finally {
      instance.unmount();
    }
  });
});
