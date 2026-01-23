import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  spawn: vi.fn(),
}));

async function loadClipboardModule(platform: NodeJS.Platform) {
  vi.resetModules();
  mocks.spawn.mockReset();
  vi.doMock("node:child_process", () => ({
    spawn: mocks.spawn,
  }));
  vi.doMock("node:process", () => ({
    default: { platform },
  }));
  return import("./clipboard.js");
}

interface MockChildProcess extends EventEmitter {
  stdin?: {
    write: (data: string, cb?: (error?: Error) => void) => void;
    end: () => void;
  };
  stderr?: EventEmitter;
}

function createChildProcess(): MockChildProcess {
  const emitter = new EventEmitter();
  const stdin = {
    write: vi.fn((_data: string, cb?: (error?: Error) => void) => {
      cb?.();
    }),
    end: vi.fn(),
  };
  const stderr = new EventEmitter();

  const child: MockChildProcess = Object.assign(emitter, {
    stdin,
    stderr,
  });

  return child;
}

describe("writeToClipboard", () => {
  it("uses pbcopy on darwin", async () => {
    const { writeToClipboard } = await loadClipboardModule("darwin");
    const child = createChildProcess();
    mocks.spawn.mockReturnValue(child);

    const promise = writeToClipboard({ text: "hello" });
    child.emit("close", 0);

    await expect(promise).resolves.toBeUndefined();
    expect(mocks.spawn).toHaveBeenCalledWith("pbcopy", [], {
      stdio: ["pipe", "ignore", "pipe"],
    });
    expect(child.stdin?.write).toHaveBeenCalled();
  });

  it("throws on unsupported platforms", async () => {
    const { writeToClipboard } = await loadClipboardModule("sunos");

    await expect(writeToClipboard({ text: "hello" })).rejects.toThrowError(
      /Clipboard not supported/,
    );
    expect(mocks.spawn).not.toHaveBeenCalled();
  });
});
