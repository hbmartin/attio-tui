import { constants, existsSync } from "node:fs";
import { access, chmod, mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { IDisposable, IPty } from "node-pty";
import * as pty from "node-pty";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

// ANSI escape sequence pattern for stripping terminal formatting
// biome-ignore lint/suspicious/noControlCharactersInRegex: Required for ANSI escape sequence matching
const ANSI_PATTERN = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
// OSC sequences + carriage returns can break string matching across platforms
// biome-ignore lint/suspicious/noControlCharactersInRegex: Required for OSC sequence matching
const OSC_PATTERN = /\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g;
const CARRIAGE_RETURN_PATTERN = /\r/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

function stripOsc(text: string): string {
  return text.replace(OSC_PATTERN, "");
}

function normalizeOutput(text: string): string {
  return stripAnsi(stripOsc(text)).replace(CARRIAGE_RETURN_PATTERN, "");
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

type EntryKind = "ts" | "dist";

interface PtySessionOptions {
  readonly entry?: EntryKind;
}

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const entryPaths = {
  ts: fileURLToPath(new URL("./cli.tsx", import.meta.url)),
  dist: join(repoRoot, "dist", "cli.js"),
};

const entryArgsByKind: Record<EntryKind, string[]> = {
  ts: ["--loader", "ts-node/esm", entryPaths.ts],
  dist: [entryPaths.dist],
};

const distAvailable = existsSync(entryPaths.dist);
const defaultEntry: EntryKind = distAvailable ? "dist" : "ts";

type ExitOutcome =
  | {
      readonly status: "exited";
      readonly exitCode: number;
      readonly signal?: number;
    }
  | { readonly status: "timeout" };

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

  const output = normalizeOutput(getOutput());
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
  private readonly entry: EntryKind;
  private exitOutcome: ExitOutcome | undefined;

  constructor({ entry = defaultEntry }: PtySessionOptions = {}) {
    this.entry = entry;
  }

  async start(): Promise<void> {
    this.tempHome = await mkdtemp(join(tmpdir(), "attio-tui-pty-"));

    if (this.entry === "dist" && !distAvailable) {
      throw new Error(
        "dist/cli.js not found. Run pnpm build before PTY tests.",
      );
    }

    const env = this.buildEnv({
      HOME: this.tempHome,
      TERM: "xterm-256color",
      // Disable color for more predictable output matching
      NO_COLOR: "1",
    });

    const nodeArgs = entryArgsByKind[this.entry];
    this.term = pty.spawn(process.execPath, [...nodeArgs], {
      name: "xterm-color",
      cols: 80,
      rows: 24,
      cwd: repoRoot,
      env,
    });

    this.term.onData((data) => {
      this.output += data;
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

  private async waitForExit(timeoutMs: number): Promise<ExitOutcome> {
    if (!this.term) {
      return { status: "timeout" };
    }

    const { term } = this;
    return new Promise((resolve) => {
      let settled = false;
      let exitDisposable: IDisposable | undefined;

      const timeoutId = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        exitDisposable?.dispose();
        resolve({ status: "timeout" });
      }, timeoutMs);

      exitDisposable = term.onExit((event) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        exitDisposable?.dispose();
        resolve({
          status: "exited",
          exitCode: event.exitCode,
          signal: event.signal,
        });
      });
    });
  }

  getNormalizedOutput(): string {
    return normalizeOutput(this.output);
  }

  write(data: string): void {
    this.term?.write(data);
  }

  async type(text: string): Promise<void> {
    // Type each character with a small delay to allow processing
    for (const char of text) {
      this.term?.write(char);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  async waitFor(text: string, options: WaitForOptions = {}): Promise<void> {
    await waitForCondition(
      () => this.getNormalizedOutput().includes(text),
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
        const output = this.getNormalizedOutput();
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

  async cleanup(): Promise<ExitOutcome> {
    if (this.exitOutcome) {
      return this.exitOutcome;
    }

    let outcome: ExitOutcome = { status: "timeout" };

    if (this.term) {
      // Try graceful shutdown with Ctrl+C
      this.write(Keys.CTRL_C);
      outcome = await this.waitForExit(1200);

      if (outcome.status === "timeout") {
        this.term.kill();
        const forcedOutcome = await this.waitForExit(1200);
        if (forcedOutcome.status === "exited") {
          outcome = forcedOutcome;
        }
      }
    }

    if (this.tempHome) {
      await rm(this.tempHome, { recursive: true, force: true });
    }

    this.exitOutcome = outcome;
    return outcome;
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

  const helperExists = await access(helperPath, constants.F_OK)
    .then(() => true)
    .catch((error: unknown) => {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return false;
      }
      throw error;
    });

  if (!helperExists) {
    return;
  }

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
        return;
      }
      throw chmodError;
    }
  }
}

// PTY tests must run sequentially - they spawn external processes
// that can interfere with each other
describe.sequential("CLI (PTY)", () => {
  let session: PtySession;

  beforeAll(async () => {
    await ensureSpawnHelperExecutable();
  });

  afterEach(async () => {
    const outcome = await session?.cleanup();
    if (outcome && outcome.status === "timeout") {
      throw new Error("PTY did not exit within the cleanup timeout");
    }
    // Small delay between tests to ensure process fully exits
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it("renders the welcome screen on launch", async () => {
    session = new PtySession();
    await session.start();

    await session.waitFor("Welcome to Attio TUI");

    const output = session.getNormalizedOutput();
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

    expect(session.getNormalizedOutput()).toContain("API key is required");
  }, 12_000);

  it("shows validation error for invalid API key format", async () => {
    session = new PtySession();
    await session.start();

    await session.waitFor("Welcome to Attio TUI");

    // Type an invalid API key
    await session.type("invalid_key");
    session.write(Keys.ENTER);

    await session.waitFor("Invalid API key format");

    expect(session.getNormalizedOutput()).toContain("Invalid API key format");
  }, 12_000);

  it("masks API key input with dots", async () => {
    session = new PtySession();
    await session.start();

    await session.waitFor("Welcome to Attio TUI");

    // Type some characters
    await session.type("abc");

    await session.waitFor("•••");

    // Should show dots, not the actual characters
    const output = session.getNormalizedOutput();
    expect(output).toContain("•••");
    expect(output).not.toContain("abc");
  }, 12_000);

  it("handles backspace to delete characters", async () => {
    session = new PtySession();
    await session.start();

    await session.waitFor("Welcome to Attio TUI");

    // Type 5 characters
    await session.type("abcde");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Delete 2 characters
    session.write(Keys.BACKSPACE);
    session.write(Keys.BACKSPACE);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should show 3 dots
    const output = session.getNormalizedOutput();
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

    const outcome = await session.cleanup();
    expect(outcome.status).toBe("exited");
  }, 12_000);
});
