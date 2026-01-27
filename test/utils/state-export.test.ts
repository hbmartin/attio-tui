import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialAppState } from "../../source/state/app-state.js";
import type { DebugRequestLogEntry } from "../../source/types/debug.js";
import { exportStateSnapshot } from "../../source/utils/state-export.js";

// Mock homedir to use temp directory
let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "state-export-"));
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

const sampleRequestLog: readonly DebugRequestLogEntry[] = [
  {
    id: "0",
    label: "GET /objects/people",
    status: "success",
    startedAt: "2024-01-01T00:00:00Z",
    durationMs: 150,
  },
  {
    id: "1",
    label: "GET /objects/companies",
    status: "error",
    startedAt: "2024-01-01T00:00:01Z",
    durationMs: 500,
    errorMessage: "rate limited",
  },
];

describe("exportStateSnapshot", () => {
  it("creates a file with correct JSON structure", async () => {
    const state = createInitialAppState();

    const filePath = await exportStateSnapshot({
      state,
      requestLog: sampleRequestLog,
      terminalDimensions: { columns: 80, rows: 24 },
      appStartedAt: Date.now() - 5000,
    });

    expect(filePath).toContain(".attio-tui/debug/state-");
    expect(filePath).toMatch(/\.json$/);

    const content = JSON.parse(await readFile(filePath, "utf-8"));

    expect(content).toHaveProperty("exportedAt");
    expect(content).toHaveProperty("uptimeMs");
    expect(content.uptimeMs).toBeGreaterThanOrEqual(0);
    expect(content).toHaveProperty("terminal", { columns: 80, rows: 24 });
    expect(content).toHaveProperty("uiDescription");
    expect(content.uiDescription).toContain("=== UI State ===");
    expect(content).toHaveProperty("state");
    expect(content.state).toHaveProperty("navigation");
    expect(content.state).toHaveProperty("debugEnabled");
    expect(content).toHaveProperty("requestLog");
    expect(content.requestLog).toHaveLength(2);
  });

  it("creates debug directory if it does not exist", async () => {
    const state = createInitialAppState();

    const filePath = await exportStateSnapshot({
      state,
      requestLog: [],
      terminalDimensions: { columns: 120, rows: 40 },
      appStartedAt: Date.now(),
    });

    // File should exist (implicitly creates directory)
    const content = await readFile(filePath, "utf-8");
    expect(content.length).toBeGreaterThan(0);
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

    const filePath = await exportStateSnapshot({
      state,
      requestLog: manyRequests,
      terminalDimensions: { columns: 80, rows: 24 },
      appStartedAt: Date.now(),
    });

    const content = JSON.parse(await readFile(filePath, "utf-8"));
    expect(content.requestLog).toHaveLength(20);
  });
});
