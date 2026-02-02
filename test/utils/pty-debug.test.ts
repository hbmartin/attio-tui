import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEY = "ATTIO_TUI_PTY_DEBUG";
const FILE_ENV_KEY = "ATTIO_TUI_PTY_DEBUG_FILE";

async function loadPtyDebug() {
  const module = await import("../../source/utils/pty-debug.js");
  return module.PtyDebug;
}

describe("PtyDebug", () => {
  let originalValue: string | undefined;
  let originalFileValue: string | undefined;
  let originalHome: string | undefined;

  beforeEach(() => {
    vi.resetModules();
    originalValue = process.env[ENV_KEY];
    originalFileValue = process.env[FILE_ENV_KEY];
    originalHome = process.env.HOME;
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
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    vi.restoreAllMocks();
  });

  function createTempDir(): string {
    return mkdtempSync(join(tmpdir(), "attio-tui-"));
  }

  function createTempLogPath(): string {
    return join(createTempDir(), "pty-debug.log");
  }

  it("treats 1 as enabled", async () => {
    process.env[ENV_KEY] = "1";
    const PtyDebug = await loadPtyDebug();
    expect(PtyDebug.isEnabled()).toBe(true);
  });

  it("treats true as enabled", async () => {
    process.env[ENV_KEY] = "TrUe";
    const PtyDebug = await loadPtyDebug();
    expect(PtyDebug.isEnabled()).toBe(true);
  });

  it("treats other values as disabled", async () => {
    process.env[ENV_KEY] = "0";
    const PtyDebug = await loadPtyDebug();
    expect(PtyDebug.isEnabled()).toBe(false);
  });

  it("writes to a log file when enabled and a path is provided", async () => {
    process.env[ENV_KEY] = "1";
    const logPath = createTempLogPath();
    process.env[FILE_ENV_KEY] = logPath;
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const PtyDebug = await loadPtyDebug();
    PtyDebug.log("hello");

    expect(writeSpy).not.toHaveBeenCalled();
    const contents = readFileSync(logPath, "utf8");
    expect(contents).toBe("[PTY-DEBUG] hello\n");
    expect(PtyDebug.getLogPath()).toBe(logPath);
  });

  it("writes to the default log file when enabled without a path", async () => {
    process.env[ENV_KEY] = "1";
    delete process.env[FILE_ENV_KEY];
    const tempHome = createTempDir();
    process.env.HOME = tempHome;
    const configDir = join(tempHome, ".attio-tui");
    mkdirSync(configDir, { recursive: true });

    const PtyDebug = await loadPtyDebug();
    PtyDebug.log("hello");

    const defaultPath = join(configDir, "debug.log");
    const contents = readFileSync(defaultPath, "utf8");
    expect(contents).toBe("[PTY-DEBUG] hello\n");
    expect(PtyDebug.getLogPath()).toBe(defaultPath);
  });

  it("does not write when disabled", async () => {
    delete process.env[ENV_KEY];
    const logPath = createTempLogPath();
    process.env[FILE_ENV_KEY] = logPath;
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const PtyDebug = await loadPtyDebug();
    PtyDebug.log("hello");

    expect(writeSpy).not.toHaveBeenCalled();
    expect(existsSync(logPath)).toBe(false);
    expect(PtyDebug.getLogPath()).toBeUndefined();
  });

  it("reports file errors once", async () => {
    process.env[ENV_KEY] = "1";
    const logPath = join(createTempDir(), "missing", "debug.log");
    process.env[FILE_ENV_KEY] = logPath;
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const PtyDebug = await loadPtyDebug();
    PtyDebug.log("hello");
    PtyDebug.log("hello again");

    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(writeSpy.mock.calls[0]?.[0]).toContain(logPath);
  });
});
