import process from "node:process";
import type { AttioClient } from "attio-ts-sdk";
import { createAttioClient } from "attio-ts-sdk";
import { Text } from "ink";
import { render } from "ink-testing-library";
import { type Dispatch, useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWebhook } from "../services/webhooks-service.js";
import type { AppAction } from "../state/app-state.js";
import type { WebhookEventType, WebhookInfo } from "../types/attio.js";
import type { DebugRequestLogEntryInput } from "../types/debug.js";
import { useWebhookOperations } from "./use-webhook-operations.js";

vi.mock("../services/webhooks-service.js", () => ({
  createWebhook: vi.fn(),
  updateWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
}));

interface HookOptions {
  readonly client: AttioClient | undefined;
  readonly dispatch: Dispatch<AppAction>;
  readonly onSuccess?: () => void;
  readonly onRequestLog?: (entry: DebugRequestLogEntryInput) => void;
}

interface HookSnapshot {
  readonly isSubmitting: boolean;
  readonly error: string | undefined;
  readonly handleCreate: (
    targetUrl: string,
    selectedEvents: readonly WebhookEventType[],
  ) => Promise<void>;
}

interface HookHarnessProps {
  readonly options: HookOptions;
  readonly onUpdate: (snapshot: HookSnapshot) => void;
}

function HookHarness({ options, onUpdate }: HookHarnessProps): JSX.Element {
  const snapshot = useWebhookOperations(options);

  useEffect(() => {
    onUpdate(snapshot);
  }, [snapshot, onUpdate]);

  return <Text>{snapshot.isSubmitting ? "submitting" : "idle"}</Text>;
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

const mockCreateWebhook = vi.mocked(createWebhook);

const TEST_API_KEY = process.env["TEST_API_KEY"] ?? "test-api-key-placeholder";

function buildWebhookInfo(): WebhookInfo {
  return {
    id: "webhook-1",
    targetUrl: "https://example.com/webhook",
    status: "active",
    subscriptions: [],
    createdAt: "2025-01-01T00:00:00Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useWebhookOperations", () => {
  it("keeps success flow intact when request logging throws", async () => {
    const client = createAttioClient({ apiKey: TEST_API_KEY });
    const dispatch = vi.fn();
    const onSuccess = vi.fn();
    const onRequestLog = vi.fn(() => {
      throw new Error("Log failed");
    });

    mockCreateWebhook.mockResolvedValueOnce(buildWebhookInfo());

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        options={{ client, dispatch, onSuccess, onRequestLog }}
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

      await latest.handleCreate("https://example.com/webhook", []);

      await waitForCondition(
        () => latest?.isSubmitting === false && latest?.error === undefined,
      );

      expect(onRequestLog).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith({ type: "CLOSE_WEBHOOK_MODAL" });
      expect(onSuccess).toHaveBeenCalledTimes(1);
    } finally {
      instance.unmount();
    }
  });

  it("keeps error state updates when request logging throws", async () => {
    const client = createAttioClient({ apiKey: TEST_API_KEY });
    const dispatch = vi.fn();
    const onSuccess = vi.fn();
    const onRequestLog = vi.fn(() => {
      throw new Error("Log failed");
    });

    mockCreateWebhook.mockRejectedValueOnce(new Error("Network down"));

    let latest: HookSnapshot | undefined;

    const instance = render(
      <HookHarness
        options={{ client, dispatch, onSuccess, onRequestLog }}
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

      await latest.handleCreate("https://example.com/webhook", []);

      await waitForCondition(
        () =>
          latest?.isSubmitting === false && latest?.error === "Network down",
      );

      expect(onRequestLog).toHaveBeenCalledTimes(1);
      expect(dispatch).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    } finally {
      instance.unmount();
    }
  });
});
