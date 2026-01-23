import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  spawn: vi.fn(),
}));

async function loadOpenBrowserModule(platform: NodeJS.Platform) {
  vi.resetModules();
  mocks.spawn.mockReset();
  vi.doMock("node:child_process", () => ({
    spawn: mocks.spawn,
  }));
  vi.doMock("node:process", () => ({
    default: { platform },
  }));
  return import("../../source/utils/open-browser.js");
}

type MockChildProcess = EventEmitter;

function createChildProcess(): MockChildProcess {
  const emitter: MockChildProcess = new EventEmitter();
  return emitter;
}

describe("openBrowser", () => {
  it("uses open on darwin", async () => {
    const { openBrowser } = await loadOpenBrowserModule("darwin");
    const child = createChildProcess();
    mocks.spawn.mockReturnValue(child);

    const promise = openBrowser({ url: "https://example.com" });
    child.emit("close", 0);

    await expect(promise).resolves.toBeUndefined();
    expect(mocks.spawn).toHaveBeenCalledWith("open", ["https://example.com"], {
      stdio: "ignore",
    });
  });

  it("uses cmd on win32", async () => {
    const { openBrowser } = await loadOpenBrowserModule("win32");
    const child = createChildProcess();
    mocks.spawn.mockReturnValue(child);

    const promise = openBrowser({ url: "https://example.com" });
    child.emit("close", 0);

    await expect(promise).resolves.toBeUndefined();
    expect(mocks.spawn).toHaveBeenCalledWith(
      "cmd",
      ["/c", "start", "", "https://example.com"],
      { stdio: "ignore" },
    );
  });
});
