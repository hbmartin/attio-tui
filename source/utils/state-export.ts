import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AppState } from "../state/app-state.js";
import type { DebugRequestLogEntry } from "../types/debug.js";
import { describeUiState } from "./describe-ui-state.js";

interface ExportStateSnapshotParams {
  readonly state: AppState;
  readonly requestLog: readonly DebugRequestLogEntry[];
  readonly terminalDimensions: {
    readonly columns: number;
    readonly rows: number;
  };
  readonly appStartedAt: number;
}

function getDebugDir(): string {
  return join(homedir(), ".attio-tui", "debug");
}

export async function exportStateSnapshot({
  state,
  requestLog,
  terminalDimensions,
  appStartedAt,
}: ExportStateSnapshotParams): Promise<string> {
  const now = new Date();
  const exportedAt = now.toISOString();
  const uptimeMs = Date.now() - appStartedAt;

  const snapshot = {
    exportedAt,
    uptimeMs,
    terminal: terminalDimensions,
    uiDescription: describeUiState(state),
    state,
    requestLog: requestLog.slice(0, 20),
  };

  const debugDir = getDebugDir();
  await mkdir(debugDir, { recursive: true });

  const safeTimestamp = exportedAt.replace(/[:.]/g, "-");
  const filePath = join(debugDir, `state-${safeTimestamp}.json`);

  const payload = JSON.stringify(
    snapshot,
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  );
  await writeFile(filePath, payload, "utf-8");

  return filePath;
}
