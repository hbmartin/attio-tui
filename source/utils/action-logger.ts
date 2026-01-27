import type { AppAction, AppState } from "../state/app-state.js";

export interface ActionLogEntry {
  readonly timestamp: string;
  readonly actionType: string;
  readonly payload: Record<string, unknown>;
  readonly stateSummary: string;
}

const MAX_ENTRIES = 100;

// Summarize a payload by omitting large data arrays and keeping counts
function sanitizePayload(action: AppAction): Record<string, unknown> {
  const { type, ...rest } = action;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (Array.isArray(value)) {
      result[key] = `[${String(value.length)} items]`;
    } else if (typeof value === "object" && value !== null) {
      result[key] = "[object]";
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Produce a compact summary of what changed between two states
function summarizeStateDiff(before: AppState, after: AppState): string {
  const diffs: string[] = [];

  if (before.debugEnabled !== after.debugEnabled) {
    diffs.push(
      `debug: ${String(before.debugEnabled)}→${String(after.debugEnabled)}`,
    );
  }

  const bNav = before.navigation;
  const aNav = after.navigation;

  if (bNav.focusedPane !== aNav.focusedPane) {
    diffs.push(`focusedPane: ${bNav.focusedPane}→${aNav.focusedPane}`);
  }

  if (bNav.navigator.selectedIndex !== aNav.navigator.selectedIndex) {
    diffs.push(
      `navIndex: ${String(bNav.navigator.selectedIndex)}→${String(aNav.navigator.selectedIndex)}`,
    );
  }

  if (bNav.navigator.loading !== aNav.navigator.loading) {
    diffs.push(
      `navLoading: ${String(bNav.navigator.loading)}→${String(aNav.navigator.loading)}`,
    );
  }

  if (bNav.navigator.categories.length !== aNav.navigator.categories.length) {
    diffs.push(
      `categories: ${String(bNav.navigator.categories.length)}→${String(aNav.navigator.categories.length)}`,
    );
  }

  if (bNav.results.selectedIndex !== aNav.results.selectedIndex) {
    diffs.push(
      `resultIndex: ${String(bNav.results.selectedIndex)}→${String(aNav.results.selectedIndex)}`,
    );
  }

  if (bNav.results.items.length !== aNav.results.items.length) {
    diffs.push(
      `resultItems: ${String(bNav.results.items.length)}→${String(aNav.results.items.length)}`,
    );
  }

  if (bNav.results.loading !== aNav.results.loading) {
    diffs.push(
      `resultsLoading: ${String(bNav.results.loading)}→${String(aNav.results.loading)}`,
    );
  }

  if (bNav.results.hasNextPage !== aNav.results.hasNextPage) {
    diffs.push(
      `hasNextPage: ${String(bNav.results.hasNextPage)}→${String(aNav.results.hasNextPage)}`,
    );
  }

  if (bNav.results.searchQuery !== aNav.results.searchQuery) {
    diffs.push(
      `searchQuery: "${bNav.results.searchQuery}"→"${aNav.results.searchQuery}"`,
    );
  }

  if (bNav.detail.activeTab !== aNav.detail.activeTab) {
    diffs.push(`detailTab: ${bNav.detail.activeTab}→${aNav.detail.activeTab}`);
  }

  if (bNav.detail.item?.id !== aNav.detail.item?.id) {
    diffs.push(
      `detailItem: ${bNav.detail.item?.id ?? "none"}→${aNav.detail.item?.id ?? "none"}`,
    );
  }

  if (bNav.commandPalette.isOpen !== aNav.commandPalette.isOpen) {
    diffs.push(
      `cmdPalette: ${String(bNav.commandPalette.isOpen)}→${String(aNav.commandPalette.isOpen)}`,
    );
  }

  if (bNav.webhookModal.mode !== aNav.webhookModal.mode) {
    diffs.push(
      `webhookModal: ${bNav.webhookModal.mode}→${aNav.webhookModal.mode}`,
    );
  }

  if (bNav.columnPicker.mode !== aNav.columnPicker.mode) {
    diffs.push(
      `columnPicker: ${bNav.columnPicker.mode}→${aNav.columnPicker.mode}`,
    );
  }

  return diffs.length > 0 ? diffs.join(", ") : "no change";
}

// biome-ignore lint/style/noNamespace: Use a namespace to group action logger helpers.
export namespace ActionLogger {
  const buffer: ActionLogEntry[] = [];

  export function record(
    action: AppAction,
    stateBefore: AppState,
    stateAfter: AppState,
  ): void {
    const entry: ActionLogEntry = {
      timestamp: new Date().toISOString(),
      actionType: action.type,
      payload: sanitizePayload(action),
      stateSummary: summarizeStateDiff(stateBefore, stateAfter),
    };

    buffer.push(entry);

    if (buffer.length > MAX_ENTRIES) {
      buffer.splice(0, buffer.length - MAX_ENTRIES);
    }
  }

  export function getEntries(): readonly ActionLogEntry[] {
    return [...buffer];
  }

  export function clear(): void {
    buffer.length = 0;
  }

  export async function writeToFile(filePath: string): Promise<void> {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { dirname } = await import("node:path");

    await mkdir(dirname(filePath), { recursive: true });
    const lines = buffer.map((entry) => JSON.stringify(entry)).join("\n");
    await writeFile(filePath, lines, "utf-8");
  }
}
