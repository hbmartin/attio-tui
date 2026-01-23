import { Text } from "ink";
import { render } from "ink-testing-library";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import type { StatusMessage } from "../types/status-message.js";
import { useTemporaryStatusMessage } from "./use-temporary-status-message.js";

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

  throw new Error("Timed out waiting for status message update");
}

interface HarnessProps {
  readonly initialMessage: StatusMessage;
  readonly timeoutMs: number;
  readonly switchMessage?: StatusMessage;
  readonly switchDelayMs?: number;
  readonly onUpdate: (message: StatusMessage | undefined) => void;
}

function Harness({
  initialMessage,
  timeoutMs,
  switchMessage,
  switchDelayMs,
  onUpdate,
}: HarnessProps): JSX.Element {
  const { message, showMessage } = useTemporaryStatusMessage({ timeoutMs });

  useEffect(() => {
    showMessage(initialMessage);

    if (!switchMessage || switchDelayMs === undefined) {
      return;
    }

    const timer = setTimeout(() => {
      showMessage(switchMessage);
    }, switchDelayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [initialMessage, showMessage, switchMessage, switchDelayMs]);

  useEffect(() => {
    onUpdate(message);
  }, [message, onUpdate]);

  return <Text>{message?.text ?? "no-message"}</Text>;
}

describe("useTemporaryStatusMessage", () => {
  it("clears messages after the timeout", async () => {
    const initialMessage: StatusMessage = {
      text: "Refresh failed",
      tone: "error",
    };

    let latest: StatusMessage | undefined;

    const instance = render(
      <Harness
        initialMessage={initialMessage}
        timeoutMs={40}
        onUpdate={(message) => {
          latest = message;
        }}
      />,
    );

    try {
      await waitForCondition(() => latest?.text === "Refresh failed");
      await waitForCondition(() => latest === undefined, { timeoutMs: 500 });
    } finally {
      instance.cleanup();
    }
  });

  it("resets the timeout when a new message is shown", async () => {
    const initialMessage: StatusMessage = {
      text: "Refresh failed",
      tone: "error",
    };
    const followUpMessage: StatusMessage = {
      text: "Still retrying",
      tone: "info",
    };

    let latest: StatusMessage | undefined;

    const instance = render(
      <Harness
        initialMessage={initialMessage}
        timeoutMs={120}
        switchMessage={followUpMessage}
        switchDelayMs={60}
        onUpdate={(message) => {
          latest = message;
        }}
      />,
    );

    try {
      await waitForCondition(() => latest?.text === "Still retrying");

      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(latest?.text).toBe("Still retrying");

      await waitForCondition(() => latest === undefined, { timeoutMs: 500 });
    } finally {
      instance.cleanup();
    }
  });
});
