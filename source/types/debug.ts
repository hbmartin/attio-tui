import type { DetailTab, PaneId, WebhookModalState } from "./navigation.js";

export type DebugRequestStatus = "success" | "error";

export interface DebugRequestLogEntry {
  readonly id: string;
  readonly label: string;
  readonly status: DebugRequestStatus;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly detail?: string;
  readonly errorMessage?: string;
}

export type DebugRequestLogEntryInput = Omit<DebugRequestLogEntry, "id">;

export interface DebugTimingSnapshot {
  readonly appStartedAt: number;
  readonly lastRequestAt?: string;
  readonly lastRequestDurationMs?: number;
}

export interface DebugStateSnapshot {
  readonly focusedPane: PaneId;
  readonly activeTab: DetailTab;
  readonly commandPaletteOpen: boolean;
  readonly resultsCount: number;
  readonly selectedIndex: number;
  readonly categoryLabel: string | undefined;
  readonly navigatorLoading: boolean;
  readonly resultsLoading: boolean;
  readonly columnPickerOpen: boolean;
  readonly webhookModalMode: WebhookModalState["mode"];
  readonly debugEnabled: boolean;
}
