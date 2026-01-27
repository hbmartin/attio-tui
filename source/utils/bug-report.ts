import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import type { AppState } from "../state/app-state.js";
import type { DebugRequestLogEntry } from "../types/debug.js";
import type { ActionLogEntry } from "./action-logger.js";
import { describeUiState } from "./describe-ui-state.js";
import { stripAnsi } from "./frame-capture.js";

interface ExportBugReportParams {
  readonly state: AppState;
  readonly requestLog: readonly DebugRequestLogEntry[];
  readonly actionHistory: readonly ActionLogEntry[];
  readonly terminalDimensions: {
    readonly columns: number;
    readonly rows: number;
  };
  readonly appStartedAt: number;
  readonly frame?: string;
}

function getDebugDir(): string {
  return join(homedir(), ".attio-tui", "debug");
}

export async function exportBugReport({
  state,
  requestLog,
  actionHistory,
  terminalDimensions,
  appStartedAt,
  frame,
}: ExportBugReportParams): Promise<string> {
  const now = new Date();
  const exportedAt = now.toISOString();
  const uptimeMs = Date.now() - appStartedAt;

  const report = {
    exportedAt,
    uptimeMs,
    terminal: terminalDimensions,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      term: process.env["TERM"] ?? "unknown",
    },
    uiDescription: describeUiState(state),
    state,
    actionHistory: [...actionHistory],
    requestLog: requestLog.slice(0, 20),
    frame: frame ? stripAnsi(frame) : undefined,
  };

  const debugDir = getDebugDir();
  await mkdir(debugDir, { recursive: true });

  const safeTimestamp = exportedAt.replace(/[:.]/g, "-");
  const filePath = join(debugDir, `bug-report-${safeTimestamp}.json`);

  const payload = JSON.stringify(
    report,
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  );
  await writeFile(filePath, payload, "utf-8");

  return filePath;
}
