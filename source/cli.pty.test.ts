import { constants, existsSync } from "node:fs";
import { access, chmod, mkdtemp, rm, stat } from "node:fs/promises";
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

interface SpawnHelperLocationCheck {
  readonly path: string;
  readonly exists: boolean;
  readonly executable: boolean;
}

interface SpawnHelperDetails {
  readonly helperPath: string;
  readonly nodePtyEntry: string;
  readonly packageRoot: string;
  readonly exists: boolean;
  readonly executable: boolean;
  readonly chmodAttempted: boolean;
  readonly chmodSucceeded: boolean;
  readonly chmodError?: string;
  readonly locationChecks: readonly SpawnHelperLocationCheck[];
}

const DEBUG_ENV_KEYS: readonly string[] = [
  "CI",
  "TERM",
  "TERM_PROGRAM",
  "COLORTERM",
  "SHELL",
  "PATH",
  "NODE_OPTIONS",
  "FORCE_COLOR",
  "NO_COLOR",
  "HOME",
  "XDG_RUNTIME_DIR",
  "ATTIO_TUI_PTY_DEBUG",
];

const DIAGNOSTIC_PATHS: readonly string[] = [
  "/dev/ptmx",
  "/dev/pts",
  "/dev/pts/0",
];

const isCi = Boolean(process.env["CI"]);

let spawnHelperDetails: SpawnHelperDetails | undefined;

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
  readonly context?: string;
  readonly diagnostics?: () => Promise<string> | string;
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
  const { timeoutMs = 8000, intervalMs = 50, context, diagnostics } = options;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  const output = normalizeOutput(getOutput());
  let diagnosticsText = "";

  if (diagnostics) {
    try {
      const rawDiagnostics = await diagnostics();
      diagnosticsText = rawDiagnostics
        ? `\nDiagnostics:\n${rawDiagnostics}`
        : "";
    } catch (error: unknown) {
      diagnosticsText = `\nDiagnostics collection failed: ${formatError(error)}`;
    }
  }

  const contextLine = context ? `Context: ${context}\n` : "";
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for condition.\n` +
      contextLine +
      `Actual output (${output.length} chars):\n` +
      `---\n${output}\n---` +
      diagnosticsText,
  );
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    const code = getErrorCode(error);
    const codeSuffix = code ? ` code=${code}` : "";
    return `${error.name}: ${error.message}${codeSuffix}`;
  }
  return `NonError: ${String(error)}`;
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return;
  }
  if (!("code" in error)) {
    return;
  }
  const codeValue = error.code;
  if (typeof codeValue === "string" || typeof codeValue === "number") {
    return String(codeValue);
  }
  return;
}

function formatEnvSnapshot(env: Record<string, string> | undefined): string {
  const entries: string[] = [];
  const source = env ?? process.env;
  for (const key of DEBUG_ENV_KEYS) {
    const value = source[key];
    entries.push(`${key}=${value ?? "<unset>"}`);
  }
  return entries.join(", ");
}

async function describePath(targetPath: string): Promise<string> {
  try {
    const stats = await stat(targetPath);
    const mode = (stats.mode % 0o1000).toString(8).padStart(3, "0");
    let kind = "other";
    if (stats.isCharacterDevice()) {
      kind = "char-device";
    } else if (stats.isDirectory()) {
      kind = "directory";
    } else if (stats.isFile()) {
      kind = "file";
    }
    return `${targetPath}: ${kind} mode=${mode}`;
  } catch (error: unknown) {
    const code = error instanceof Error ? getErrorCode(error) : undefined;
    return `${targetPath}: error=${code ?? "unknown"}`;
  }
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
  private spawnEnv: Record<string, string> | undefined;
  private spawnError: unknown;
  private startTimestamp: number | undefined;
  private dataEvents = 0;
  private readonly dataChunks: string[] = [];
  private exitEvent: { exitCode: number; signal?: number } | undefined;
  private firstOutputTimestamp: number | undefined;
  private lastOutputTimestamp: number | undefined;

  constructor({ entry = defaultEntry }: PtySessionOptions = {}) {
    this.entry = entry;
  }

  async start(): Promise<void> {
    this.tempHome = await mkdtemp(join(tmpdir(), "attio-tui-pty-"));
    this.startTimestamp = Date.now();

    if (this.entry === "dist" && !distAvailable) {
      throw new Error(
        "dist/cli.js not found. Run pnpm build before PTY tests.",
      );
    }

    const envOverrides: Record<string, string> = {
      HOME: this.tempHome,
      TERM: "xterm-256color",
      // Disable color for more predictable output matching
      NO_COLOR: "1",
    };
    const debugFlag = process.env["ATTIO_TUI_PTY_DEBUG"] ?? (isCi ? "1" : "");
    if (debugFlag) {
      envOverrides["ATTIO_TUI_PTY_DEBUG"] = debugFlag;
    }
    const env = this.buildEnv(envOverrides);
    this.spawnEnv = env;

    const nodeArgs = entryArgsByKind[this.entry];
    try {
      this.term = pty.spawn(process.execPath, [...nodeArgs], {
        name: "xterm-color",
        cols: 80,
        rows: 24,
        cwd: repoRoot,
        env,
      });
    } catch (error: unknown) {
      this.spawnError = error;
      const diagnostics = await this.getDiagnostics("spawn");
      throw new Error(
        `Failed to spawn PTY.\n${formatError(error)}\nDiagnostics:\n${diagnostics}`,
      );
    }

    this.term.onData((data) => {
      const now = Date.now();
      if (this.firstOutputTimestamp === undefined) {
        this.firstOutputTimestamp = now;
      }
      this.lastOutputTimestamp = now;
      this.output += data;
      this.dataEvents += 1;
      this.dataChunks.push(data);
      if (this.dataChunks.length > 5) {
        this.dataChunks.shift();
      }
    });
    this.term.onExit((event) => {
      this.exitEvent = { exitCode: event.exitCode, signal: event.signal };
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
      {
        ...options,
        context: options.context ?? `waitFor("${text}")`,
        diagnostics:
          options.diagnostics ?? (() => this.getDiagnostics("waitFor")),
      },
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
      {
        ...options,
        context: options.context ?? "waitForAny",
        diagnostics:
          options.diagnostics ?? (() => this.getDiagnostics("waitForAny")),
      },
    );
    return matchedText;
  }

  async getDiagnostics(context: string): Promise<string> {
    const details: string[] = [];
    details.push(`Context: ${context}`);
    if (this.startTimestamp) {
      details.push(
        `Elapsed: ${Date.now() - this.startTimestamp}ms since start`,
      );
    }
    details.push(
      `Platform: ${process.platform} ${process.arch} Node ${process.version}`,
    );
    details.push(
      `Entry: ${this.entry} distAvailable=${distAvailable} args=${entryArgsByKind[
        this.entry
      ].join(" ")}`,
    );
    details.push(`Repo root: ${repoRoot}`);
    details.push(`Entry paths: ts=${entryPaths.ts} dist=${entryPaths.dist}`);
    if (this.term) {
      details.push(
        `PTY: pid=${this.term.pid} process=${this.term.process} cols=${this.term.cols} rows=${this.term.rows}`,
      );
    } else {
      details.push("PTY: not started");
    }
    details.push(
      `Output: chars=${this.output.length} normalized=${this.getNormalizedOutput().length} dataEvents=${this.dataEvents}`,
    );
    if (
      this.firstOutputTimestamp !== undefined &&
      this.lastOutputTimestamp !== undefined &&
      this.startTimestamp !== undefined
    ) {
      details.push(
        `Output timing: first=${this.firstOutputTimestamp - this.startTimestamp}ms last=${this.lastOutputTimestamp - this.startTimestamp}ms idle=${Date.now() - this.lastOutputTimestamp}ms`,
      );
    }
    if (this.dataChunks.length > 0) {
      const chunkSizes = this.dataChunks.map((chunk) => chunk.length).join(",");
      const lastChunk = this.dataChunks.at(-1) ?? "";
      const preview = normalizeOutput(lastChunk).slice(0, 200);
      details.push(
        `Output chunks: count=${this.dataChunks.length} sizes=${chunkSizes}`,
      );
      details.push(`Last chunk preview (200 chars): ${preview}`);
    }
    if (this.exitEvent) {
      details.push(
        `Exit event: exitCode=${this.exitEvent.exitCode} signal=${this.exitEvent.signal ?? "<none>"}`,
      );
    }
    if (this.spawnError) {
      details.push(`Spawn error: ${formatError(this.spawnError)}`);
    }
    if (spawnHelperDetails) {
      details.push(
        `spawn-helper: path=${spawnHelperDetails.helperPath} exists=${spawnHelperDetails.exists} executable=${spawnHelperDetails.executable} chmodAttempted=${spawnHelperDetails.chmodAttempted} chmodSucceeded=${spawnHelperDetails.chmodSucceeded} chmodError=${spawnHelperDetails.chmodError ?? "<none>"}`,
      );
      details.push(
        `node-pty: entry=${spawnHelperDetails.nodePtyEntry} root=${spawnHelperDetails.packageRoot}`,
      );
      for (const check of spawnHelperDetails.locationChecks) {
        details.push(
          `spawn-helper check: ${check.path} exists=${check.exists} executable=${check.executable}`,
        );
      }
    } else {
      details.push("spawn-helper: details unavailable");
    }
    details.push(`Env: ${formatEnvSnapshot(this.spawnEnv)}`);
    for (const diagnosticPath of DIAGNOSTIC_PATHS) {
      details.push(await describePath(diagnosticPath));
    }
    return details.join("\n");
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

  // spawn-helper is only required on macOS. On Linux, node-pty uses forkpty()
  // directly and doesn't need the spawn-helper binary.
  if (process.platform !== "darwin") {
    spawnHelperDetails = {
      helperPath: "(not required on this platform)",
      nodePtyEntry,
      packageRoot,
      exists: true,
      executable: true,
      chmodAttempted: false,
      chmodSucceeded: false,
      locationChecks: [],
    };
    return;
  }

  // Check same directories as node-pty (in order): build/Release, build/Debug, prebuilds/{platform}-{arch}
  const candidateDirs = [
    "build/Release",
    "build/Debug",
    `prebuilds/${process.platform}-${process.arch}`,
  ];

  const locationChecks: SpawnHelperLocationCheck[] = [];
  let helperPath: string | undefined;
  let helperExists = false;

  for (const dir of candidateDirs) {
    const candidatePath = join(packageRoot, dir, "spawn-helper");
    const exists = await access(candidatePath, constants.F_OK)
      .then(() => true)
      .catch((error: unknown) => {
        if (getErrorCode(error) === "ENOENT") {
          return false;
        }
        throw error;
      });
    const executable = exists
      ? await access(candidatePath, constants.X_OK)
          .then(() => true)
          .catch(() => false)
      : false;

    locationChecks.push({ path: candidatePath, exists, executable });

    if (exists && helperPath === undefined) {
      helperPath = candidatePath;
      helperExists = true;
    }
  }

  // Use first found path, or fall back to prebuilds path for error messaging
  if (helperPath === undefined) {
    helperPath = join(
      packageRoot,
      `prebuilds/${process.platform}-${process.arch}`,
      "spawn-helper",
    );
  }

  let executable = false;
  let chmodAttempted = false;
  let chmodSucceeded = false;
  let chmodError: string | undefined;

  if (helperExists) {
    executable = await access(helperPath, constants.X_OK)
      .then(() => true)
      .catch(() => false);
    if (!executable) {
      chmodAttempted = true;
      try {
        await chmod(helperPath, 0o755);
        chmodSucceeded = true;
      } catch (error: unknown) {
        if (error instanceof Error && getErrorCode(error) === "ENOENT") {
          executable = false;
        } else {
          chmodError = formatError(error);
        }
      }
      if (chmodSucceeded) {
        executable = await access(helperPath, constants.X_OK)
          .then(() => true)
          .catch(() => false);
      }
    }
  }

  spawnHelperDetails = {
    helperPath,
    nodePtyEntry,
    packageRoot,
    exists: helperExists,
    executable,
    chmodAttempted,
    chmodSucceeded,
    chmodError,
    locationChecks,
  };
  if (!helperExists) {
    throw new Error(`node-pty spawn-helper not found at ${helperPath}`);
  }
  if (!executable) {
    const details = chmodError ? ` (${chmodError})` : "";
    throw new Error(
      `node-pty spawn-helper is not executable at ${helperPath}${details}`,
    );
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
      const diagnostics = await session.getDiagnostics("cleanup");
      throw new Error(
        `PTY did not exit within the cleanup timeout.\nDiagnostics:\n${diagnostics}`,
      );
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
