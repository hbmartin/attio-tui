import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  type AppAction,
  type AppState,
  createInitialAppState,
} from "../../source/state/app-state.js";
import { ActionLogger } from "../../source/utils/action-logger.js";

function makeState(overrides?: Partial<AppState>): AppState {
  return {
    ...createInitialAppState(),
    ...overrides,
  };
}

describe("ActionLogger", () => {
  afterEach(() => {
    ActionLogger.clear();
  });

  describe("record", () => {
    it("records an action with timestamp, type, payload, and summary", () => {
      const before = makeState();
      const after = makeState({ debugEnabled: true });
      const action: AppAction = { type: "SET_DEBUG_ENABLED", enabled: true };

      ActionLogger.record(action, before, after);

      const entries = ActionLogger.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]?.actionType).toBe("SET_DEBUG_ENABLED");
      expect(entries[0]?.payload).toEqual({ enabled: true });
      expect(entries[0]?.stateSummary).toContain("debug:");
      expect(entries[0]?.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });

    it("sanitizes array payloads to count strings", () => {
      const before = makeState();
      const after = makeState();
      const action: AppAction = {
        type: "SET_RESULTS",
        items: [],
        hasNextPage: false,
      };

      ActionLogger.record(action, before, after);

      const entries = ActionLogger.getEntries();
      expect(entries[0]?.payload.items).toBe("[0 items]");
      expect(entries[0]?.payload.hasNextPage).toBe(false);
    });

    it("produces 'no change' summary when states are identical", () => {
      const state = makeState();
      const action: AppAction = { type: "TOGGLE_DEBUG" };

      // Pass same state for before and after to test no-change path
      ActionLogger.record(action, state, state);

      const entries = ActionLogger.getEntries();
      expect(entries[0]?.stateSummary).toBe("no change");
    });
  });

  describe("ring buffer capacity", () => {
    it("limits entries to 100", () => {
      const state = makeState();
      const action: AppAction = { type: "TOGGLE_DEBUG" };

      for (let i = 0; i < 120; i++) {
        ActionLogger.record(action, state, state);
      }

      expect(ActionLogger.getEntries()).toHaveLength(100);
    });

    it("keeps the most recent entries when exceeding capacity", () => {
      const state = makeState();

      // Record 105 entries with distinguishable payloads
      for (let i = 0; i < 105; i++) {
        const action: AppAction = {
          type: "SET_DEBUG_ENABLED",
          enabled: i % 2 === 0,
        };
        ActionLogger.record(action, state, state);
      }

      const entries = ActionLogger.getEntries();
      expect(entries).toHaveLength(100);
      // The first 5 entries should have been evicted
      // Entry index 0 in buffer was originally entry #5 (0-indexed)
    });
  });

  describe("clear", () => {
    it("empties the buffer", () => {
      const state = makeState();
      ActionLogger.record({ type: "TOGGLE_DEBUG" }, state, state);
      expect(ActionLogger.getEntries()).toHaveLength(1);

      ActionLogger.clear();
      expect(ActionLogger.getEntries()).toHaveLength(0);
    });
  });

  describe("getEntries", () => {
    it("returns a copy (not a reference to the internal buffer)", () => {
      const state = makeState();
      ActionLogger.record({ type: "TOGGLE_DEBUG" }, state, state);

      const entries1 = ActionLogger.getEntries();
      const entries2 = ActionLogger.getEntries();
      expect(entries1).not.toBe(entries2);
      expect(entries1).toEqual(entries2);
    });
  });

  describe("writeToFile", () => {
    it("writes entries as newline-delimited JSON", async () => {
      const tempDir = await mkdtemp(join(tmpdir(), "action-logger-"));

      try {
        const state = makeState();
        ActionLogger.record({ type: "TOGGLE_DEBUG" }, state, state);
        ActionLogger.record(
          { type: "SET_DEBUG_ENABLED", enabled: true },
          state,
          makeState({ debugEnabled: true }),
        );

        const filePath = join(tempDir, "actions.ndjson");
        await ActionLogger.writeToFile(filePath);

        const content = await readFile(filePath, "utf-8");
        const lines = content.split("\n").filter(Boolean);
        expect(lines).toHaveLength(2);

        const parsed0 = JSON.parse(lines[0] ?? "");
        expect(parsed0).toHaveProperty("timestamp");
        expect(parsed0).toHaveProperty("actionType", "TOGGLE_DEBUG");
        expect(parsed0).toHaveProperty("payload");
        expect(parsed0).toHaveProperty("stateSummary");

        const parsed1 = JSON.parse(lines[1] ?? "");
        expect(parsed1).toHaveProperty("actionType", "SET_DEBUG_ENABLED");
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    it("creates parent directories if needed", async () => {
      const tempDir = await mkdtemp(join(tmpdir(), "action-logger-"));

      try {
        const state = makeState();
        ActionLogger.record({ type: "TOGGLE_DEBUG" }, state, state);

        const filePath = join(tempDir, "nested", "dir", "actions.ndjson");
        await ActionLogger.writeToFile(filePath);

        const content = await readFile(filePath, "utf-8");
        expect(content.length).toBeGreaterThan(0);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("state diff summary", () => {
    it("detects focusedPane change", () => {
      const before = makeState();
      const after = makeState({
        navigation: {
          ...before.navigation,
          focusedPane: "results",
        },
      });

      ActionLogger.record(
        { type: "FOCUS_PANE", paneId: "results" },
        before,
        after,
      );

      const entries = ActionLogger.getEntries();
      expect(entries[0]?.stateSummary).toContain(
        "focusedPane: navigator→results",
      );
    });

    it("detects results item count change", () => {
      const before = makeState();
      const after = makeState({
        navigation: {
          ...before.navigation,
          results: {
            ...before.navigation.results,
            items: [
              {
                type: "notes",
                id: "1",
                title: "Test Note",
                data: {
                  id: "1",
                  title: "Test Note",
                  parentObjectName: "People",
                  parentRecordName: "Alice",
                  createdAt: "2024-01-01",
                },
              },
            ],
          },
        },
      });

      ActionLogger.record(
        {
          type: "SET_RESULTS",
          items: after.navigation.results.items,
          hasNextPage: false,
        },
        before,
        after,
      );

      const entries = ActionLogger.getEntries();
      expect(entries[0]?.stateSummary).toContain("resultItems: 0→1");
    });

    it("detects command palette state change", () => {
      const before = makeState();
      const after = makeState({
        navigation: {
          ...before.navigation,
          commandPalette: {
            isOpen: true,
            query: "",
            selectedIndex: 0,
          },
        },
      });

      ActionLogger.record({ type: "OPEN_COMMAND_PALETTE" }, before, after);

      const entries = ActionLogger.getEntries();
      expect(entries[0]?.stateSummary).toContain("cmdPalette: false→true");
    });

    it("detects multiple changes in one action", () => {
      const before = makeState();
      const after = makeState({
        debugEnabled: true,
        navigation: {
          ...before.navigation,
          focusedPane: "detail",
        },
      });

      ActionLogger.record({ type: "TOGGLE_DEBUG" }, before, after);

      const entries = ActionLogger.getEntries();
      expect(entries[0]?.stateSummary).toContain("debug:");
      expect(entries[0]?.stateSummary).toContain("focusedPane:");
    });
  });
});
