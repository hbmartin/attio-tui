import { appendFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { getConfigDir } from "./config-path.js";

const DEBUG_FILE_ENV = "ATTIO_TUI_PTY_DEBUG_FILE";

let fileErrorReported = false;

function getDefaultLogPath(): string {
  return join(getConfigDir(), "debug.log");
}

function getLogFilePath(): string | undefined {
  const raw = process.env[DEBUG_FILE_ENV];
  return raw || undefined;
}

function resolveLogPath(): string {
  return getLogFilePath() ?? getDefaultLogPath();
}

function writeLogToFile(line: string): void {
  const filePath = resolveLogPath();
  try {
    appendFileSync(filePath, `${line}\n`);
  } catch (error) {
    if (!fileErrorReported) {
      fileErrorReported = true;
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        `[PTY-DEBUG] Failed to write to ${filePath}: ${message}\n`,
      );
    }
  }
}

// biome-ignore lint/style/noNamespace: Use a namespace to group PTY debug helpers.
export namespace PtyDebug {
  export function isEnabled(): boolean {
    const raw = process.env["ATTIO_TUI_PTY_DEBUG"];
    if (!raw) {
      return false;
    }
    return raw === "1" || raw.toLowerCase() === "true";
  }

  export function getLogPath(): string | undefined {
    if (!isEnabled()) {
      return;
    }
    return resolveLogPath();
  }

  export function log(message: string): void {
    if (!isEnabled()) {
      return;
    }
    const line = `[PTY-DEBUG] ${message}`;
    writeLogToFile(line);
  }
}
