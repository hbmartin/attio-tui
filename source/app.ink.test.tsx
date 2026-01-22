import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import App from "./app.js";

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

  throw new Error("Timed out waiting for Ink to render the app");
}

describe("App (Ink renderer)", () => {
  it("renders the API key prompt on launch", async () => {
    const originalHome = process.env["HOME"];
    const tempHome = await mkdtemp(join(tmpdir(), "attio-tui-test-"));
    process.env["HOME"] = tempHome;

    const instance = render(<App />);
    Object.assign(instance.stdin, {
      ref: () => undefined,
      unref: () => undefined,
      read: () => null,
    });

    try {
      await waitForCondition(() => {
        const frame = instance.lastFrame();
        return frame ? frame.includes("Welcome to Attio TUI") : false;
      });

      expect(instance.lastFrame()).toContain("Welcome to Attio TUI");
    } finally {
      instance.cleanup();
      if (originalHome === undefined) {
        process.env["HOME"] = undefined;
      } else {
        process.env["HOME"] = originalHome;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });
});
