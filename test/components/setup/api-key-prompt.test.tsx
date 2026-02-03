import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { render } from "ink-testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiKeyPrompt } from "../../../source/components/setup/api-key-prompt.js";

const ENV_KEY = "ATTIO_TUI_PTY_DEBUG";
const FILE_ENV_KEY = "ATTIO_TUI_PTY_DEBUG_FILE";

describe("ApiKeyPrompt", () => {
  let originalValue: string | undefined;
  let originalFileValue: string | undefined;

  beforeEach(() => {
    originalValue = process.env[ENV_KEY];
    originalFileValue = process.env[FILE_ENV_KEY];
  });

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = originalValue;
    }
    if (originalFileValue === undefined) {
      delete process.env[FILE_ENV_KEY];
    } else {
      process.env[FILE_ENV_KEY] = originalFileValue;
    }
    vi.restoreAllMocks();
  });

  function createTempLogPath(): string {
    const tempDir = mkdtempSync(join(tmpdir(), "attio-tui-"));
    return join(tempDir, "pty-debug.log");
  }

  async function waitForLogMessage(
    logPath: string,
    message: string,
    timeoutMs = 1000,
  ): Promise<string> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const contents = readFileSync(logPath, "utf8");
      if (contents.includes(message)) {
        return contents;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(
      `Timed out waiting for log message: "${message}" after ${timeoutMs}ms`,
    );
  }

  it("logs mount and unmount when PTY debug is enabled", async () => {
    process.env[ENV_KEY] = "1";
    const logPath = createTempLogPath();
    process.env[FILE_ENV_KEY] = logPath;

    const instance = render(<ApiKeyPrompt onSubmit={() => undefined} />);

    await new Promise((resolve) => setTimeout(resolve, 0));

    let contents = readFileSync(logPath, "utf8");
    expect(contents).toContain("[PTY-DEBUG] api-key prompt mount\n");

    instance.unmount();

    // Poll until React's useEffect cleanup logs the unmount message
    contents = await waitForLogMessage(
      logPath,
      "[PTY-DEBUG] api-key prompt unmount\n",
    );
    expect(contents).toContain("[PTY-DEBUG] api-key prompt unmount\n");
  });
});
