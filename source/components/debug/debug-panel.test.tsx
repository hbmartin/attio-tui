import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import type {
  DebugRequestLogEntry,
  DebugStateSnapshot,
  DebugTimingSnapshot,
} from "../../types/debug.js";
import { DebugPanel } from "./debug-panel.js";

describe("DebugPanel", () => {
  it("renders request log, timing, and state", () => {
    const requestLog: DebugRequestLogEntry[] = [
      {
        id: "1",
        label: "fetch notes",
        status: "success",
        startedAt: "2025-01-01T00:00:00Z",
        durationMs: 120,
        detail: "initial",
      },
    ];
    const timing: DebugTimingSnapshot = {
      appStartedAt: Date.now() - 5000,
      lastRequestAt: requestLog[0]?.startedAt,
      lastRequestDurationMs: requestLog[0]?.durationMs,
    };
    const state: DebugStateSnapshot = {
      focusedPane: "results",
      activeTab: "summary",
      commandPaletteOpen: false,
      resultsCount: 3,
      selectedIndex: 1,
      categoryLabel: "Notes",
      navigatorLoading: false,
      resultsLoading: false,
      columnPickerOpen: false,
      webhookModalMode: "closed",
      debugEnabled: true,
    };

    const { lastFrame } = render(
      <DebugPanel requestLog={requestLog} timing={timing} state={state} />,
    );

    const frame = lastFrame();
    expect(frame).toContain("Debug Panel");
    expect(frame).toContain("fetch notes");
    expect(frame).toContain("Pane: results");
    expect(frame).toContain("Requests");
  });
});
