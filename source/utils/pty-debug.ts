import { appendFileSync } from "node:fs";
import process from "node:process";

const DEBUG_FILE_ENV = "ATTIO_TUI_PTY_DEBUG_FILE";

function getLogFilePath(): string | undefined {
  const raw = process.env[DEBUG_FILE_ENV];
  if (!raw) {
    return;
  }
  return raw;
}

function writeLogToFile(line: string): void {
  const filePath = getLogFilePath();
  if (!filePath) {
    return;
  }
  try {
    appendFileSync(filePath, `${line}\n`);
  } catch {
    // Ignore log file errors to avoid console noise.
  }
}

// biome-ignore lint/style/noNamespace: Use a namespace to group PTY debug helpers.
export namespace PtyDebug {
  export function isEnabled(): boolean {
    const raw = process.env["ATTIO_TUI_PTY_DEBUG"];
    if (!raw) {
      return false;
    }
    if (!(raw === "1" || raw.toLowerCase() === "true")) {
      return false;
    }
    return Boolean(getLogFilePath());
  }

  export function log(message: string): void {
    if (!isEnabled()) {
      return;
    }
    const line = `[PTY-DEBUG] ${message}`;
    writeLogToFile(line);
  }
}
