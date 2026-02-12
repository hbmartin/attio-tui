import { describe, expect, it } from "vitest";
import { createListId, parseObjectSlug } from "../../source/types/ids.js";
import {
  createInitialNavigationState,
  DETAIL_TABS,
  getNavigatorCategoryKey,
  type NavigatorCategory,
  PANE_ORDER,
} from "../../source/types/navigation.js";

describe("PANE_ORDER", () => {
  it("should have three panes", () => {
    expect(PANE_ORDER).toHaveLength(3);
  });

  it("should start with navigator", () => {
    expect(PANE_ORDER[0]).toBe("navigator");
  });

  it("should have results in middle", () => {
    expect(PANE_ORDER[1]).toBe("results");
  });

  it("should end with detail", () => {
    expect(PANE_ORDER[2]).toBe("detail");
  });
});

describe("DETAIL_TABS", () => {
  it("should have four tabs", () => {
    expect(DETAIL_TABS).toHaveLength(4);
  });

  it("should include summary, json, sdk, actions", () => {
    expect(DETAIL_TABS).toContain("summary");
    expect(DETAIL_TABS).toContain("json");
    expect(DETAIL_TABS).toContain("sdk");
    expect(DETAIL_TABS).toContain("actions");
  });

  it("should start with summary", () => {
    expect(DETAIL_TABS[0]).toBe("summary");
  });
});

describe("createInitialNavigationState", () => {
  it("should return valid initial state", () => {
    const state = createInitialNavigationState();

    expect(state.focusedPane).toBe("navigator");
    expect(state.navigator.categories).toEqual([]);
    expect(state.navigator.selectedIndex).toBe(0);
    expect(state.navigator.loading).toBe(true);
    expect(state.results.items).toEqual([]);
    expect(state.results.selectedIndex).toBe(0);
    expect(state.results.loading).toBe(false);
    expect(state.results.hasNextPage).toBe(false);
    expect(state.results.searchQuery).toBe("");
    expect(state.detail.activeTab).toBe("summary");
    expect(state.detail.item).toBeUndefined();
    expect(state.commandPalette.isOpen).toBe(false);
    expect(state.commandPalette.query).toBe("");
    expect(state.commandPalette.selectedIndex).toBe(0);
    expect(state.columnPicker.mode).toBe("closed");
  });

  it("should create independent instances", () => {
    const state1 = createInitialNavigationState();
    const state2 = createInitialNavigationState();

    expect(state1).not.toBe(state2);
    expect(state1.navigator).not.toBe(state2.navigator);
    expect(state1.results).not.toBe(state2.results);
  });
});

describe("getNavigatorCategoryKey", () => {
  it("should return key for object category", () => {
    const category: NavigatorCategory = {
      type: "object",
      objectSlug: parseObjectSlug("companies"),
    };
    expect(getNavigatorCategoryKey(category)).toBe("object-companies");
  });

  it("should return key for list category", () => {
    const category: NavigatorCategory = {
      type: "list",
      listId: createListId("550e8400-e29b-41d4-a716-446655440000"),
    };
    expect(getNavigatorCategoryKey(category)).toBe(
      "list-550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("should return type for notes category", () => {
    const category: NavigatorCategory = { type: "notes" };
    expect(getNavigatorCategoryKey(category)).toBe("notes");
  });

  it("should return type for tasks category", () => {
    const category: NavigatorCategory = { type: "tasks" };
    expect(getNavigatorCategoryKey(category)).toBe("tasks");
  });

  it("should return type for meetings category", () => {
    const category: NavigatorCategory = { type: "meetings" };
    expect(getNavigatorCategoryKey(category)).toBe("meetings");
  });

  it("should return type for webhooks category", () => {
    const category: NavigatorCategory = { type: "webhooks" };
    expect(getNavigatorCategoryKey(category)).toBe("webhooks");
  });

  it("should return unique keys for different objects", () => {
    const cat1: NavigatorCategory = {
      type: "object",
      objectSlug: parseObjectSlug("companies"),
    };
    const cat2: NavigatorCategory = {
      type: "object",
      objectSlug: parseObjectSlug("people"),
    };
    expect(getNavigatorCategoryKey(cat1)).not.toBe(
      getNavigatorCategoryKey(cat2),
    );
  });

  it("should return unique keys for different lists", () => {
    const cat1: NavigatorCategory = {
      type: "list",
      listId: createListId("550e8400-e29b-41d4-a716-446655440000"),
    };
    const cat2: NavigatorCategory = {
      type: "list",
      listId: createListId("550e8400-e29b-41d4-a716-446655440001"),
    };
    expect(getNavigatorCategoryKey(cat1)).not.toBe(
      getNavigatorCategoryKey(cat2),
    );
  });

  it("should return type for lists category", () => {
    const category: NavigatorCategory = { type: "lists" };
    expect(getNavigatorCategoryKey(category)).toBe("lists");
  });
});

describe("createInitialNavigationState listDrill", () => {
  it("should initialize listDrill at lists level", () => {
    const state = createInitialNavigationState();
    expect(state.listDrill).toEqual({ level: "lists" });
  });
});
