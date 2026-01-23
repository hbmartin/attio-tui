import process from "node:process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PtyDebug } from "./pty-debug.js";

const ENV_KEY = "ATTIO_TUI_PTY_DEBUG";

describe("PtyDebug", () => {
  let originalValue: string | undefined;

  beforeEach(() => {
    originalValue = process.env[ENV_KEY];
  });

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = originalValue;
    }
    vi.restoreAllMocks();
  });

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
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    PtyDebug.log("hello");

    expect(writeSpy).toHaveBeenCalledWith("[PTY-DEBUG] hello\n");
  });

  it("does not write when disabled", () => {
    delete process.env[ENV_KEY];
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    PtyDebug.log("hello");

    expect(writeSpy).not.toHaveBeenCalled();
  });
});
