import { constants } from "node:fs";
import { access, chmod, mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as pty from "node-pty";
import { describe, expect, it } from "vitest";

interface WaitForOptions {
  readonly timeoutMs?: number;
  readonly intervalMs?: number;
}

async function waitForCondition(
  condition: () => boolean,
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

  throw new Error("Timed out waiting for the CLI to render in the PTY");
}

const ANSI_PATTERN_SOURCE = "\\u001b\\[[0-9;?]*[ -/]*[@-~]";
const ANSI_PATTERN = new RegExp(ANSI_PATTERN_SOURCE, "g");
const require = createRequire(import.meta.url);

function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

function buildEnv(overrides: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  for (const [key, value] of Object.entries(overrides)) {
    env[key] = value;
  }
  return env;
}

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
    // pnpm can install prebuilt helpers without executable perms if scripts are blocked.
    try {
      await chmod(helperPath, 0o755);
    } catch (chmodError: unknown) {
      if (
        chmodError instanceof Error &&
        (chmodError as NodeJS.ErrnoException).code === "ENOENT"
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
  it("launches the CLI and renders the welcome screen", async () => {
    const repoRoot = fileURLToPath(new URL("../", import.meta.url));
    const cliEntry = fileURLToPath(new URL("./cli.tsx", import.meta.url));
    const tempHome = await mkdtemp(join(tmpdir(), "attio-tui-pty-"));
    const nodeArgs = ["--loader", "ts-node/esm", cliEntry];

    await ensureSpawnHelperExecutable();

    const term = pty.spawn(process.execPath, nodeArgs, {
      name: "xterm-color",
      cols: 80,
      rows: 24,
      cwd: repoRoot,
      env: buildEnv({
        HOME: tempHome,
        TERM: "xterm-256color",
      }),
    });

    let output = "";
    term.onData((data) => {
      output += data;
    });

    try {
      await waitForCondition(() =>
        stripAnsi(output).includes("Welcome to Attio TUI"),
      );
      expect(stripAnsi(output)).toContain("Welcome to Attio TUI");
    } finally {
      const exitPromise = new Promise<void>((resolve) => {
        term.onExit(() => resolve());
      });
      term.write("\u0003");
      await Promise.race([
        exitPromise,
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
      term.kill();
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 12_000);
});
