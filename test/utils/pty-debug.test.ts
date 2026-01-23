import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PtyDebug } from "../../source/utils/pty-debug.js";

const ENV_KEY = "ATTIO_TUI_PTY_DEBUG";
const FILE_ENV_KEY = "ATTIO_TUI_PTY_DEBUG_FILE";

describe("PtyDebug", () => {
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

  it("treats 1 as enabled", () => {
    process.env[ENV_KEY] = "1";
    expect(PtyDebug.isEnabled()).toBe(true);
  });

  it("treats true as enabled", () => {
    process.env[ENV_KEY] = "TrUe";
    expect(PtyDebug.isEnabled()).toBe(true);
  });

  it("treats other values as disabled", () => {
    process.env[ENV_KEY] = "0";
    expect(PtyDebug.isEnabled()).toBe(false);
  });

  it("writes to stderr when enabled", () => {
    process.env[ENV_KEY] = "1";
    delete process.env[FILE_ENV_KEY];
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    PtyDebug.log("hello");

    expect(writeSpy).toHaveBeenCalledWith("[PTY-DEBUG] hello\n");
  });

  it("writes to a log file when enabled and a path is provided", () => {
    process.env[ENV_KEY] = "1";
    const logPath = createTempLogPath();
    process.env[FILE_ENV_KEY] = logPath;
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    PtyDebug.log("hello");

    expect(writeSpy).toHaveBeenCalledWith("[PTY-DEBUG] hello\n");
    const contents = readFileSync(logPath, "utf8");
    expect(contents).toBe("[PTY-DEBUG] hello\n");
  });

  it("does not write when disabled", () => {
    delete process.env[ENV_KEY];
    const logPath = createTempLogPath();
    process.env[FILE_ENV_KEY] = logPath;
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    PtyDebug.log("hello");

    expect(writeSpy).not.toHaveBeenCalled();
    expect(existsSync(logPath)).toBe(false);
  });
});
