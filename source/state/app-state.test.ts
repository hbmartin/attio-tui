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
});
