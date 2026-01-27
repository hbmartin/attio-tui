import { describe, expect, it } from "vitest";
import {
  type AppState,
  createInitialAppState,
} from "../../source/state/app-state.js";
import type { ResultItem } from "../../source/types/navigation.js";
import { describeUiState } from "../../source/utils/describe-ui-state.js";

function makeState(overrides?: Partial<AppState>): AppState {
  return {
    ...createInitialAppState(),
    ...overrides,
  };
}

const sampleNoteItem: ResultItem = {
  type: "notes",
  id: "note-1",
  title: "Alice Smith",
  subtitle: "People",
  data: {
    id: "note-1",
    title: "Alice Smith",
    parentObjectName: "People",
    parentRecordName: "Alice",
    createdAt: "2024-01-01",
  },
};

describe("describeUiState", () => {
  it("describes initial/default state", () => {
    const state = makeState();
    const description = describeUiState(state);

    expect(description).toContain("=== UI State ===");
    expect(description).toContain("Navigator:");
    expect(description).toContain("focused=true");
    expect(description).toContain("0 categories");
    expect(description).toContain('selected="none"');
    expect(description).toContain("loading=true");
    expect(description).toContain("Results: 0 items");
    expect(description).toContain("Detail: tab=summary");
    expect(description).toContain("Command Palette: closed");
    expect(description).toContain("Column Picker: closed");
    expect(description).toContain("Webhook Modal: closed");
    expect(description).toContain("Debug: enabled=false");
  });

  it("describes populated state with categories and items", () => {
    const state = makeState({
      navigation: {
        ...createInitialAppState().navigation,
        navigator: {
          categories: [
            { type: "object", objectSlug: "companies" as never },
            { type: "object", objectSlug: "people" as never },
            { type: "notes" },
          ],
          selectedIndex: 1,
          loading: false,
        },
        results: {
          items: [sampleNoteItem],
          selectedIndex: 0,
          loading: false,
          hasNextPage: true,
          searchQuery: "",
        },
        detail: {
          activeTab: "summary",
          item: sampleNoteItem,
        },
      },
    });

    const description = describeUiState(state);

    expect(description).toContain("3 categories");
    expect(description).toContain('selected="people"');
    expect(description).toContain("(index 1)");
    expect(description).toContain("loading=false");
    expect(description).toContain("1 items");
    expect(description).toContain('"Alice Smith"');
    expect(description).toContain("hasNextPage=true");
    expect(description).toContain("Detail: tab=summary");
  });

  it("describes open command palette", () => {
    const state = makeState({
      navigation: {
        ...createInitialAppState().navigation,
        commandPalette: {
          isOpen: true,
          query: "help",
          selectedIndex: 2,
        },
      },
    });

    const description = describeUiState(state);

    expect(description).toContain(
      'Command Palette: open (query="help", selectedIndex=2)',
    );
  });

  it("describes open column picker", () => {
    const state = makeState({
      navigation: {
        ...createInitialAppState().navigation,
        columnPicker: {
          mode: "open",
          entityKey: "object-companies" as never,
          title: "Columns: Companies",
        },
      },
    });

    const description = describeUiState(state);

    expect(description).toContain("Column Picker: open");
    expect(description).toContain("Columns: Companies");
  });

  it("describes webhook create modal", () => {
    const state = makeState({
      navigation: {
        ...createInitialAppState().navigation,
        webhookModal: {
          mode: "create",
          step: "url",
          targetUrl: "https://example.com",
          selectedEvents: [],
        },
      },
    });

    const description = describeUiState(state);

    expect(description).toContain(
      'Webhook Modal: create (step=url, url="https://example.com", events=0)',
    );
  });

  it("describes webhook delete modal", () => {
    const state = makeState({
      navigation: {
        ...createInitialAppState().navigation,
        webhookModal: {
          mode: "delete",
          webhookId: "wh-123",
          webhookUrl: "https://hook.example.com",
        },
      },
    });

    const description = describeUiState(state);

    expect(description).toContain("Webhook Modal: delete");
    expect(description).toContain("wh-123");
  });

  it("describes debug enabled state", () => {
    const state = makeState({ debugEnabled: true });
    const description = describeUiState(state);

    expect(description).toContain("Debug: enabled=true");
  });

  it("shows results pane focus", () => {
    const state = makeState({
      navigation: {
        ...createInitialAppState().navigation,
        focusedPane: "results",
      },
    });

    const description = describeUiState(state);

    // Navigator should not be focused
    expect(description).toContain("Navigator: focused=false");
    expect(description).toContain("Detail: tab=summary");
    expect(description).toContain("focused=false");
  });

  it("shows search query in results", () => {
    const state = makeState({
      navigation: {
        ...createInitialAppState().navigation,
        results: {
          items: [],
          selectedIndex: 0,
          loading: true,
          hasNextPage: false,
          searchQuery: "test query",
        },
      },
    });

    const description = describeUiState(state);

    expect(description).toContain('searchQuery="test query"');
  });
});
