import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialAppState } from "../../source/state/app-state.js";
import type { DebugRequestLogEntry } from "../../source/types/debug.js";
import type { ActionLogEntry } from "../../source/utils/action-logger.js";
import { exportBugReport } from "../../source/utils/bug-report.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "bug-report-"));
  vi.mock("node:os", async (importOriginal) => {
    const original = await importOriginal<typeof import("node:os")>();
    return {
      ...original,
      homedir: () => tempDir,
    };
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(tempDir, { recursive: true, force: true });
});

const sampleActionHistory: readonly ActionLogEntry[] = [
  {
    timestamp: "2024-01-01T00:00:00.000Z",
    actionType: "TOGGLE_DEBUG",
    payload: {},
    stateSummary: "debug: false→true",
  },
  {
    timestamp: "2024-01-01T00:00:01.000Z",
    actionType: "FOCUS_PANE",
    payload: { paneId: "results" },
    stateSummary: "focusedPane: navigator→results",
  },
];

const sampleRequestLog: readonly DebugRequestLogEntry[] = [
  {
    id: "0",
    label: "GET /objects/people",
    status: "success",
    startedAt: "2024-01-01T00:00:00Z",
    durationMs: 150,
  },
];

describe("exportBugReport", () => {
  it("creates a complete bug report bundle", async () => {
    const state = createInitialAppState();

    const filePath = await exportBugReport({
      state,
      requestLog: sampleRequestLog,
      actionHistory: sampleActionHistory,
      terminalDimensions: { columns: 80, rows: 24 },
      appStartedAt: Date.now() - 10_000,
      frame: "\u001b[32mHello\u001b[0m World",
    });

    expect(filePath).toContain(".attio-tui/debug/bug-report-");
    expect(filePath).toMatch(/\.json$/);

    const content = JSON.parse(await readFile(filePath, "utf-8"));

    expect(content).toHaveProperty("exportedAt");
    expect(content).toHaveProperty("uptimeMs");
    expect(content.uptimeMs).toBeGreaterThanOrEqual(0);
    expect(content).toHaveProperty("terminal", { columns: 80, rows: 24 });
    expect(content).toHaveProperty("environment");
    expect(content.environment).toHaveProperty("nodeVersion");
    expect(content.environment).toHaveProperty("platform");
    expect(content.environment).toHaveProperty("term");
    expect(content).toHaveProperty("uiDescription");
    expect(content.uiDescription).toContain("=== UI State ===");
    expect(content).toHaveProperty("state");
    expect(content).toHaveProperty("actionHistory");
    expect(content.actionHistory).toHaveLength(2);
    expect(content).toHaveProperty("requestLog");
    expect(content.requestLog).toHaveLength(1);
    expect(content).toHaveProperty("frame");
    // Frame should have ANSI stripped
    expect(content.frame).toBe("Hello World");
  });

  it("handles empty action history and request log", async () => {
    const state = createInitialAppState();

    const filePath = await exportBugReport({
      state,
      requestLog: [],
      actionHistory: [],
      terminalDimensions: { columns: 120, rows: 40 },
      appStartedAt: Date.now(),
    });

    const content = JSON.parse(await readFile(filePath, "utf-8"));

    expect(content.actionHistory).toEqual([]);
    expect(content.requestLog).toEqual([]);
    expect(content.frame).toBeUndefined();
  });

  it("omits frame when not provided", async () => {
    const state = createInitialAppState();

    const filePath = await exportBugReport({
      state,
      requestLog: [],
      actionHistory: [],
      terminalDimensions: { columns: 80, rows: 24 },
      appStartedAt: Date.now(),
    });

    const content = JSON.parse(await readFile(filePath, "utf-8"));
    expect(content.frame).toBeUndefined();
  });

  it("includes full action history with all entries", async () => {
    const state = createInitialAppState();
    const history: ActionLogEntry[] = Array.from({ length: 50 }, (_, i) => ({
      timestamp: new Date(Date.now() + i * 1000).toISOString(),
      actionType: `ACTION_${String(i)}`,
      payload: { index: i },
      stateSummary: "no change",
    }));

    const filePath = await exportBugReport({
      state,
      requestLog: sampleRequestLog,
      actionHistory: history,
      terminalDimensions: { columns: 80, rows: 24 },
      appStartedAt: Date.now(),
    });

    const content = JSON.parse(await readFile(filePath, "utf-8"));
    expect(content.actionHistory).toHaveLength(50);
  });

  it("limits request log to 20 entries", async () => {
    const state = createInitialAppState();
    const manyRequests: DebugRequestLogEntry[] = Array.from(
      { length: 30 },
      (_, i) => ({
        id: String(i),
        label: `request-${String(i)}`,
        status: "success" as const,
        startedAt: "2024-01-01T00:00:00Z",
        durationMs: 100,
      }),
    );

    const filePath = await exportBugReport({
      state,
      requestLog: manyRequests,
      actionHistory: [],
      terminalDimensions: { columns: 80, rows: 24 },
      appStartedAt: Date.now(),
    });

    const content = JSON.parse(await readFile(filePath, "utf-8"));
    expect(content.requestLog).toHaveLength(20);
  });
});
