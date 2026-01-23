import { describe, expect, it } from "vitest";
import type { NoteInfo } from "../types/attio.js";
import { parseObjectSlug } from "../types/ids.js";
import type { NavigatorCategory, ResultItem } from "../types/navigation.js";
import {
  type AppAction,
  type AppState,
  appReducer,
  createInitialAppState,
} from "./app-state.js";

const makeNoteInfo = (id: string, title: string): NoteInfo => ({
  id,
  parentObject: "companies",
  parentRecordId: "record-1",
  title,
  contentPlaintext: "Sample note",
  createdAt: "2025-01-01T00:00:00Z",
  createdByType: "workspace-member",
  createdById: "user-1",
});

const makeNoteItem = (id: string, title: string): ResultItem => ({
  type: "notes",
  id,
  title,
  data: makeNoteInfo(id, title),
});

describe("appReducer", () => {
  const initialState = createInitialAppState();

  describe("debug", () => {
    it("should toggle debug", () => {
      const result = appReducer(initialState, { type: "TOGGLE_DEBUG" });
      expect(result.debugEnabled).toBe(true);
    });

    it("should set debug enabled", () => {
      const result = appReducer(initialState, {
        type: "SET_DEBUG_ENABLED",
        enabled: true,
      });
      expect(result.debugEnabled).toBe(true);
    });
  });

  describe("pane focus", () => {
    it("should focus a specific pane", () => {
      const action: AppAction = { type: "FOCUS_PANE", paneId: "results" };
      const result = appReducer(initialState, action);
      expect(result.navigation.focusedPane).toBe("results");
    });

    it("should cycle to next pane", () => {
      const action: AppAction = { type: "FOCUS_NEXT_PANE" };
      const result = appReducer(initialState, action);
      expect(result.navigation.focusedPane).toBe("results");
    });

    it("should cycle to previous pane", () => {
      const state: AppState = {
        ...initialState,
        navigation: { ...initialState.navigation, focusedPane: "results" },
      };
      const action: AppAction = { type: "FOCUS_PREVIOUS_PANE" };
      const result = appReducer(state, action);
      expect(result.navigation.focusedPane).toBe("navigator");
    });

    it("should wrap around when cycling next from detail", () => {
      const state: AppState = {
        ...initialState,
        navigation: { ...initialState.navigation, focusedPane: "detail" },
      };
      const action: AppAction = { type: "FOCUS_NEXT_PANE" };
      const result = appReducer(state, action);
      expect(result.navigation.focusedPane).toBe("navigator");
    });

    it("should wrap around when cycling previous from navigator", () => {
      const action: AppAction = { type: "FOCUS_PREVIOUS_PANE" };
      const result = appReducer(initialState, action);
      expect(result.navigation.focusedPane).toBe("detail");
    });
  });

  describe("navigator", () => {
    it("should set categories", () => {
      const categories: NavigatorCategory[] = [
        { type: "object", objectSlug: parseObjectSlug("companies") },
        { type: "notes" },
      ];
      const action: AppAction = { type: "SET_CATEGORIES", categories };
      const result = appReducer(initialState, action);
      expect(result.navigation.navigator.categories).toEqual(categories);
      expect(result.navigation.navigator.loading).toBe(false);
    });

    it("should select a category by index", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          navigator: {
            ...initialState.navigation.navigator,
            categories: [
              { type: "object", objectSlug: parseObjectSlug("companies") },
              { type: "notes" },
            ],
          },
        },
      };
      const action: AppAction = { type: "SELECT_CATEGORY", index: 1 };
      const result = appReducer(state, action);
      expect(result.navigation.navigator.selectedIndex).toBe(1);
    });

    it("should navigate category down", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          navigator: {
            ...initialState.navigation.navigator,
            categories: [
              { type: "object", objectSlug: parseObjectSlug("companies") },
              { type: "notes" },
            ],
            selectedIndex: 0,
          },
        },
      };
      const action: AppAction = {
        type: "NAVIGATE_CATEGORY",
        direction: "down",
      };
      const result = appReducer(state, action);
      expect(result.navigation.navigator.selectedIndex).toBe(1);
    });

    it("should navigate category up", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          navigator: {
            ...initialState.navigation.navigator,
            categories: [
              { type: "object", objectSlug: parseObjectSlug("companies") },
              { type: "notes" },
            ],
            selectedIndex: 1,
          },
        },
      };
      const action: AppAction = { type: "NAVIGATE_CATEGORY", direction: "up" };
      const result = appReducer(state, action);
      expect(result.navigation.navigator.selectedIndex).toBe(0);
    });

    it("should not go below zero when navigating up", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          navigator: {
            ...initialState.navigation.navigator,
            categories: [{ type: "notes" }],
            selectedIndex: 0,
          },
        },
      };
      const action: AppAction = { type: "NAVIGATE_CATEGORY", direction: "up" };
      const result = appReducer(state, action);
      expect(result.navigation.navigator.selectedIndex).toBe(0);
    });

    it("should not exceed max index when navigating down", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          navigator: {
            ...initialState.navigation.navigator,
            categories: [{ type: "notes" }],
            selectedIndex: 0,
          },
        },
      };
      const action: AppAction = {
        type: "NAVIGATE_CATEGORY",
        direction: "down",
      };
      const result = appReducer(state, action);
      expect(result.navigation.navigator.selectedIndex).toBe(0);
    });

    it("should set loading state", () => {
      const action: AppAction = {
        type: "SET_NAVIGATOR_LOADING",
        loading: true,
      };
      const result = appReducer(initialState, action);
      expect(result.navigation.navigator.loading).toBe(true);
    });

    it("should not go negative when navigating down with empty list", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          navigator: {
            ...initialState.navigation.navigator,
            categories: [],
            selectedIndex: 0,
          },
        },
      };
      const action: AppAction = {
        type: "NAVIGATE_CATEGORY",
        direction: "down",
      };
      const result = appReducer(state, action);
      expect(result.navigation.navigator.selectedIndex).toBe(0);
    });
  });

  describe("results", () => {
    const testItems: ResultItem[] = [
      makeNoteItem("1", "Item 1"),
      makeNoteItem("2", "Item 2"),
    ];

    it("should set results", () => {
      const action: AppAction = {
        type: "SET_RESULTS",
        items: testItems,
        hasNextPage: true,
      };
      const result = appReducer(initialState, action);
      expect(result.navigation.results.items).toEqual(testItems);
      expect(result.navigation.results.hasNextPage).toBe(true);
      expect(result.navigation.results.selectedIndex).toBe(0);
    });

    it("should append results", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          results: {
            ...initialState.navigation.results,
            items: testItems,
            selectedIndex: 1,
          },
        },
      };
      const newItems: ResultItem[] = [makeNoteItem("3", "Item 3")];
      const action: AppAction = {
        type: "APPEND_RESULTS",
        items: newItems,
        hasNextPage: false,
      };
      const result = appReducer(state, action);
      expect(result.navigation.results.items).toHaveLength(3);
      expect(result.navigation.results.selectedIndex).toBe(1);
    });

    it("should navigate result down", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          results: {
            ...initialState.navigation.results,
            items: testItems,
            selectedIndex: 0,
          },
        },
      };
      const action: AppAction = { type: "NAVIGATE_RESULT", direction: "down" };
      const result = appReducer(state, action);
      expect(result.navigation.results.selectedIndex).toBe(1);
    });

    it("should set search query", () => {
      const action: AppAction = { type: "SET_SEARCH_QUERY", query: "test" };
      const result = appReducer(initialState, action);
      expect(result.navigation.results.searchQuery).toBe("test");
    });

    it("should not go negative when navigating down with empty list", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          results: {
            ...initialState.navigation.results,
            items: [],
            selectedIndex: 0,
          },
        },
      };
      const action: AppAction = { type: "NAVIGATE_RESULT", direction: "down" };
      const result = appReducer(state, action);
      expect(result.navigation.results.selectedIndex).toBe(0);
    });
  });

  describe("detail", () => {
    it("should set detail tab", () => {
      const action: AppAction = { type: "SET_DETAIL_TAB", tab: "json" };
      const result = appReducer(initialState, action);
      expect(result.navigation.detail.activeTab).toBe("json");
    });

    it("should navigate to next tab", () => {
      const action: AppAction = { type: "NAVIGATE_TAB", direction: "next" };
      const result = appReducer(initialState, action);
      expect(result.navigation.detail.activeTab).toBe("json");
    });

    it("should navigate to previous tab", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          detail: { ...initialState.navigation.detail, activeTab: "json" },
        },
      };
      const action: AppAction = { type: "NAVIGATE_TAB", direction: "previous" };
      const result = appReducer(state, action);
      expect(result.navigation.detail.activeTab).toBe("summary");
    });

    it("should wrap around tabs", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          detail: { ...initialState.navigation.detail, activeTab: "actions" },
        },
      };
      const action: AppAction = { type: "NAVIGATE_TAB", direction: "next" };
      const result = appReducer(state, action);
      expect(result.navigation.detail.activeTab).toBe("summary");
    });

    it("should set detail item", () => {
      const item: ResultItem = makeNoteItem("test", "Test");
      const action: AppAction = { type: "SET_DETAIL_ITEM", item };
      const result = appReducer(initialState, action);
      expect(result.navigation.detail.item).toEqual(item);
    });
  });

  describe("command palette", () => {
    it("should open command palette", () => {
      const action: AppAction = { type: "OPEN_COMMAND_PALETTE" };
      const result = appReducer(initialState, action);
      expect(result.navigation.commandPalette.isOpen).toBe(true);
      expect(result.navigation.commandPalette.query).toBe("");
    });

    it("should close command palette", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          commandPalette: {
            ...initialState.navigation.commandPalette,
            isOpen: true,
            query: "test",
          },
        },
      };
      const action: AppAction = { type: "CLOSE_COMMAND_PALETTE" };
      const result = appReducer(state, action);
      expect(result.navigation.commandPalette.isOpen).toBe(false);
      expect(result.navigation.commandPalette.query).toBe("");
    });

    it("should set command query", () => {
      const action: AppAction = { type: "SET_COMMAND_QUERY", query: "help" };
      const result = appReducer(initialState, action);
      expect(result.navigation.commandPalette.query).toBe("help");
      expect(result.navigation.commandPalette.selectedIndex).toBe(0);
    });

    it("should navigate commands", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          commandPalette: {
            ...initialState.navigation.commandPalette,
            isOpen: true,
            selectedIndex: 0,
          },
        },
      };
      const action: AppAction = { type: "NAVIGATE_COMMAND", direction: "down" };
      const result = appReducer(state, action);
      expect(result.navigation.commandPalette.selectedIndex).toBe(1);
    });
  });

  describe("column picker", () => {
    it("should open column picker", () => {
      const action: AppAction = {
        type: "OPEN_COLUMN_PICKER",
        entityKey: "object-companies",
        title: "Columns: Companies",
      };
      const result = appReducer(initialState, action);
      expect(result.navigation.columnPicker.mode).toBe("open");
      if (result.navigation.columnPicker.mode === "open") {
        expect(result.navigation.columnPicker.entityKey).toBe(
          "object-companies",
        );
        expect(result.navigation.columnPicker.title).toBe("Columns: Companies");
      }
    });

    it("should close column picker", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          columnPicker: {
            mode: "open",
            entityKey: "notes",
            title: "Columns: Notes",
          },
        },
      };
      const action: AppAction = { type: "CLOSE_COLUMN_PICKER" };
      const result = appReducer(state, action);
      expect(result.navigation.columnPicker.mode).toBe("closed");
    });
  });

  describe("webhook modal", () => {
    it("should open webhook create modal", () => {
      const action: AppAction = { type: "OPEN_WEBHOOK_CREATE" };
      const result = appReducer(initialState, action);
      expect(result.navigation.webhookModal.mode).toBe("create");
      if (result.navigation.webhookModal.mode === "create") {
        expect(result.navigation.webhookModal.step).toBe("url");
        expect(result.navigation.webhookModal.targetUrl).toBe("");
        expect(result.navigation.webhookModal.selectedEvents).toEqual([]);
      }
    });

    it("should open webhook edit modal", () => {
      const action: AppAction = {
        type: "OPEN_WEBHOOK_EDIT",
        webhookId: "webhook-1",
        targetUrl: "https://example.com/webhook",
        selectedEvents: ["record.created", "note.created"],
      };
      const result = appReducer(initialState, action);
      expect(result.navigation.webhookModal.mode).toBe("edit");
      if (result.navigation.webhookModal.mode === "edit") {
        expect(result.navigation.webhookModal.webhookId).toBe("webhook-1");
        expect(result.navigation.webhookModal.targetUrl).toBe(
          "https://example.com/webhook",
        );
        expect(result.navigation.webhookModal.selectedEvents).toEqual([
          "record.created",
          "note.created",
        ]);
      }
    });

    it("should open webhook delete confirmation", () => {
      const action: AppAction = {
        type: "OPEN_WEBHOOK_DELETE",
        webhookId: "webhook-1",
        webhookUrl: "https://example.com/webhook",
      };
      const result = appReducer(initialState, action);
      expect(result.navigation.webhookModal.mode).toBe("delete");
      if (result.navigation.webhookModal.mode === "delete") {
        expect(result.navigation.webhookModal.webhookId).toBe("webhook-1");
        expect(result.navigation.webhookModal.webhookUrl).toBe(
          "https://example.com/webhook",
        );
      }
    });

    it("should close webhook modal", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          webhookModal: {
            mode: "create",
            step: "url",
            targetUrl: "https://example.com",
            selectedEvents: [],
          },
        },
      };
      const action: AppAction = { type: "CLOSE_WEBHOOK_MODAL" };
      const result = appReducer(state, action);
      expect(result.navigation.webhookModal.mode).toBe("closed");
    });

    it("should set webhook URL", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          webhookModal: {
            mode: "create",
            step: "url",
            targetUrl: "",
            selectedEvents: [],
          },
        },
      };
      const action: AppAction = {
        type: "WEBHOOK_SET_URL",
        url: "https://example.com/webhook",
      };
      const result = appReducer(state, action);
      if (result.navigation.webhookModal.mode === "create") {
        expect(result.navigation.webhookModal.targetUrl).toBe(
          "https://example.com/webhook",
        );
      }
    });

    it("should toggle webhook event selection", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          webhookModal: {
            mode: "create",
            step: "subscriptions",
            targetUrl: "https://example.com",
            selectedEvents: ["record.created"],
          },
        },
      };

      // Toggle on a new event
      const addAction: AppAction = {
        type: "WEBHOOK_TOGGLE_EVENT",
        eventType: "note.created",
      };
      const addResult = appReducer(state, addAction);
      if (addResult.navigation.webhookModal.mode === "create") {
        expect(addResult.navigation.webhookModal.selectedEvents).toContain(
          "note.created",
        );
        expect(addResult.navigation.webhookModal.selectedEvents).toContain(
          "record.created",
        );
      }

      // Toggle off an existing event
      const removeAction: AppAction = {
        type: "WEBHOOK_TOGGLE_EVENT",
        eventType: "record.created",
      };
      const removeResult = appReducer(state, removeAction);
      if (removeResult.navigation.webhookModal.mode === "create") {
        expect(
          removeResult.navigation.webhookModal.selectedEvents,
        ).not.toContain("record.created");
      }
    });

    it("should navigate webhook form steps", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          webhookModal: {
            mode: "create",
            step: "url",
            targetUrl: "https://example.com",
            selectedEvents: [],
          },
        },
      };

      // Navigate next
      const nextAction: AppAction = {
        type: "WEBHOOK_NAVIGATE_STEP",
        direction: "next",
      };
      const nextResult = appReducer(state, nextAction);
      if (nextResult.navigation.webhookModal.mode === "create") {
        expect(nextResult.navigation.webhookModal.step).toBe("subscriptions");
      }

      // Navigate to review
      const reviewState: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          webhookModal: {
            mode: "create",
            step: "subscriptions",
            targetUrl: "https://example.com",
            selectedEvents: ["record.created"],
          },
        },
      };
      const toReviewResult = appReducer(reviewState, nextAction);
      if (toReviewResult.navigation.webhookModal.mode === "create") {
        expect(toReviewResult.navigation.webhookModal.step).toBe("review");
      }

      // Navigate previous from review
      const prevAction: AppAction = {
        type: "WEBHOOK_NAVIGATE_STEP",
        direction: "previous",
      };
      const prevResult = appReducer(toReviewResult, prevAction);
      if (prevResult.navigation.webhookModal.mode === "create") {
        expect(prevResult.navigation.webhookModal.step).toBe("subscriptions");
      }
    });

    it("should not allow navigating before first step", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          webhookModal: {
            mode: "create",
            step: "url",
            targetUrl: "",
            selectedEvents: [],
          },
        },
      };
      const action: AppAction = {
        type: "WEBHOOK_NAVIGATE_STEP",
        direction: "previous",
      };
      const result = appReducer(state, action);
      if (result.navigation.webhookModal.mode === "create") {
        expect(result.navigation.webhookModal.step).toBe("url");
      }
    });

    it("should not allow navigating past last step", () => {
      const state: AppState = {
        ...initialState,
        navigation: {
          ...initialState.navigation,
          webhookModal: {
            mode: "create",
            step: "review",
            targetUrl: "https://example.com",
            selectedEvents: ["record.created"],
          },
        },
      };
      const action: AppAction = {
        type: "WEBHOOK_NAVIGATE_STEP",
        direction: "next",
      };
      const result = appReducer(state, action);
      if (result.navigation.webhookModal.mode === "create") {
        expect(result.navigation.webhookModal.step).toBe("review");
      }
    });
  });
});
