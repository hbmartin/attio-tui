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
  return import("../../source/utils/clipboard.js");
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

  it("uses xclip on linux", async () => {
    const { writeToClipboard } = await loadClipboardModule("linux");
    const child = createChildProcess();
    mocks.spawn.mockReturnValue(child);

    const promise = writeToClipboard({ text: "linux text" });
    child.emit("close", 0);

    await expect(promise).resolves.toBeUndefined();
    expect(mocks.spawn).toHaveBeenCalledWith(
      "xclip",
      ["-selection", "clipboard"],
      {
        stdio: ["pipe", "ignore", "pipe"],
      },
    );
    expect(child.stdin?.write).toHaveBeenCalled();
  });

  it("rejects when stderr emits data and process exits with non-zero code", async () => {
    const { writeToClipboard } = await loadClipboardModule("darwin");
    const child = createChildProcess();
    mocks.spawn.mockReturnValue(child);

    const promise = writeToClipboard({ text: "hello" });
    child.stderr?.emit("data", Buffer.from("clipboard error message"));
    child.emit("close", 1);

    await expect(promise).rejects.toThrow("clipboard error message");
  });

  it("rejects when spawn throws", async () => {
    const { writeToClipboard } = await loadClipboardModule("darwin");
    const spawnError = new Error("spawn failed");
    mocks.spawn.mockImplementation(() => {
      throw spawnError;
    });

    await expect(writeToClipboard({ text: "hello" })).rejects.toThrow(
      "spawn failed",
    );
    expect(mocks.spawn).toHaveBeenCalledWith("pbcopy", [], {
      stdio: ["pipe", "ignore", "pipe"],
    });
  });
});
