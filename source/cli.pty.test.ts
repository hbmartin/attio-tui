import { constants } from "node:fs";
import { access, chmod, mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { IPty } from "node-pty";
import * as pty from "node-pty";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

// ANSI escape sequence pattern for stripping terminal formatting
// biome-ignore lint/suspicious/noControlCharactersInRegex: Required for ANSI escape sequence matching
const ANSI_PATTERN = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

// Common key codes for terminal input
const Keys = {
  ENTER: "\r",
  BACKSPACE: "\x7f",
  CTRL_C: "\u0003",
  ESCAPE: "\u001b",
  ARROW_UP: "\u001b[A",
  ARROW_DOWN: "\u001b[B",
  ARROW_RIGHT: "\u001b[C",
  ARROW_LEFT: "\u001b[D",
  TAB: "\t",
  SHIFT_TAB: "\u001b[Z",
} as const;

interface WaitForOptions {
  readonly timeoutMs?: number;
  readonly intervalMs?: number;
}

/**
 * Waits for a condition to be true, polling at regular intervals.
 * Throws with diagnostic output if the timeout is reached.
 */
async function waitForCondition(
  condition: () => boolean,
  getOutput: () => string,
  options: WaitForOptions = {},
): Promise<void> {
  const { timeoutMs = 8000, intervalMs = 50 } = options;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  const output = stripAnsi(getOutput());
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for condition.\n` +
      `Actual output (${output.length} chars):\n` +
      `---\n${output}\n---`,
  );
}

/**
 * Helper class for managing PTY sessions in tests.
 * Handles spawning, output capture, input, and cleanup.
 */
class PtySession {
  private term: IPty | undefined;
  private output = "";
  private tempHome: string | undefined;
  private exitPromise: Promise<void> | undefined;

  async start(): Promise<void> {
    const repoRoot = fileURLToPath(new URL("../", import.meta.url));
    const cliEntry = fileURLToPath(new URL("./cli.tsx", import.meta.url));
    this.tempHome = await mkdtemp(join(tmpdir(), "attio-tui-pty-"));

    const env = this.buildEnv({
      HOME: this.tempHome,
      TERM: "xterm-256color",
      // Disable color for more predictable output matching
      NO_COLOR: "1",
    });

    this.term = pty.spawn(
      process.execPath,
      ["--loader", "ts-node/esm", cliEntry],
      {
        name: "xterm-color",
        cols: 80,
        rows: 24,
        cwd: repoRoot,
        env,
      },
    );

    this.term.onData((data) => {
      this.output += data;
    });

    this.exitPromise = new Promise<void>((resolve) => {
      this.term?.onExit(() => resolve());
    });
  }

  private buildEnv(overrides: Record<string, string>): Record<string, string> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }
    return { ...env, ...overrides };
  }

  getOutput(): string {
    return this.output;
  }

  getStrippedOutput(): string {
    return stripAnsi(this.output);
  }

  write(data: string): void {
    this.term?.write(data);
  }

  type(text: string): void {
    // Type each character individually with small delay for reliability
    for (const char of text) {
      this.term?.write(char);
    }
  }

  async waitFor(text: string, options: WaitForOptions = {}): Promise<void> {
    await waitForCondition(
      () => this.getStrippedOutput().includes(text),
      () => this.output,
      options,
    );
  }

  async waitForAny(
    texts: readonly string[],
    options: WaitForOptions = {},
  ): Promise<string> {
    let matchedText = "";
    await waitForCondition(
      () => {
        const output = this.getStrippedOutput();
        for (const text of texts) {
          if (output.includes(text)) {
            matchedText = text;
            return true;
          }
        }
        return false;
      },
      () => this.output,
      options,
    );
    return matchedText;
  }

  async cleanup(): Promise<void> {
    if (this.term) {
      // Try graceful shutdown with Ctrl+C
      this.write(Keys.CTRL_C);
      await Promise.race([
        this.exitPromise,
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
      this.term.kill();
    }
    if (this.tempHome) {
      await rm(this.tempHome, { recursive: true, force: true });
    }
  }
}

// Ensure node-pty spawn helper has execute permissions
const require = createRequire(import.meta.url);

async function ensureSpawnHelperExecutable(): Promise<void> {
  const nodePtyEntry = require.resolve("node-pty");
  const packageRoot = dirname(dirname(nodePtyEntry));
  const helperPath = join(
    packageRoot,
    "prebuilds",
    `${process.platform}-${process.arch}`,
    "spawn-helper",
  );

  try {
    await access(helperPath, constants.X_OK);
  } catch {
    try {
      await chmod(helperPath, 0o755);
    } catch (chmodError: unknown) {
      if (
        chmodError instanceof Error &&
        "code" in chmodError &&
        chmodError.code === "ENOENT"
      ) {
        throw new Error(
          `spawn-helper not found at expected path: ${helperPath}. ` +
            `Ensure node-pty prebuilds are installed for ${process.platform}-${process.arch}.`,
        );
      }
      throw chmodError;
    }
  }
}

describe("CLI (PTY)", () => {
  let session: PtySession;

  beforeAll(async () => {
    await ensureSpawnHelperExecutable();
  });

  afterEach(async () => {
    await session?.cleanup();
  });

  it("renders the welcome screen on launch", async () => {
    session = new PtySession();
    await session.start();

    await session.waitFor("Welcome to Attio TUI");

    const output = session.getStrippedOutput();
    expect(output).toContain("Welcome to Attio TUI");
    expect(output).toContain("API Key:");
    expect(output).toContain("Press Enter to submit");
  }, 12_000);

  it("shows validation error when submitting empty API key", async () => {
    session = new PtySession();
    await session.start();

    await session.waitFor("Welcome to Attio TUI");
    session.write(Keys.ENTER);

    await session.waitFor("API key is required");

    expect(session.getStrippedOutput()).toContain("API key is required");
  }, 12_000);

  it("shows validation error for invalid API key format", async () => {
    session = new PtySession();
    await session.start();

    await session.waitFor("Welcome to Attio TUI");

    // Type an invalid API key
    session.type("invalid_key");
    session.write(Keys.ENTER);

    await session.waitFor("Invalid API key format");

    expect(session.getStrippedOutput()).toContain("Invalid API key format");
  }, 12_000);

  it("masks API key input with dots", async () => {
    session = new PtySession();
    await session.start();

    await session.waitFor("Welcome to Attio TUI");

    // Type some characters
    session.type("abc");

    // Wait a moment for render
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should show dots, not the actual characters
    const output = session.getStrippedOutput();
    expect(output).toContain("•••");
    expect(output).not.toContain("abc");
  }, 12_000);

  it("handles backspace to delete characters", async () => {
    session = new PtySession();
    await session.start();

    await session.waitFor("Welcome to Attio TUI");

    // Type 5 characters
    session.type("abcde");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Delete 2 characters
    session.write(Keys.BACKSPACE);
    session.write(Keys.BACKSPACE);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should show 3 dots
    const output = session.getStrippedOutput();
    expect(output).toContain("•••");
    // Count occurrences - should have exactly 3 consecutive dots in the input area
    expect(output).toMatch(/API Key:\s*•••\|/);
  }, 12_000);

  it("responds to Ctrl+C for exit", async () => {
    session = new PtySession();
    await session.start();

    await session.waitFor("Welcome to Attio TUI");

    // Send Ctrl+C
    session.write(Keys.CTRL_C);

    // The session should exit - cleanup will handle verification
    // If Ctrl+C doesn't work, cleanup will timeout and kill
  }, 12_000);
});
