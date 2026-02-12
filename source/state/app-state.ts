import type { WebhookEventType } from "../types/attio.js";
import type { Columns } from "../types/columns.js";
import type { ObjectSlug } from "../types/ids.js";
import {
  createInitialNavigationState,
  DETAIL_TABS,
  type DetailTab,
  type ListDrillState,
  type NavigationState,
  type NavigatorCategory,
  type ObjectDrillState,
  PANE_ORDER,
  type PaneId,
  type ResultItem,
  type ResultsState,
  WEBHOOK_FORM_STEPS,
  type WebhookFormStep,
} from "../types/navigation.js";

// Discriminated union for all app actions
export type AppAction =
  // Pane focus
  | { readonly type: "FOCUS_PANE"; readonly paneId: PaneId }
  | { readonly type: "FOCUS_NEXT_PANE" }
  | { readonly type: "FOCUS_PREVIOUS_PANE" }
  // Debug
  | { readonly type: "TOGGLE_DEBUG" }
  | { readonly type: "SET_DEBUG_ENABLED"; readonly enabled: boolean }
  // Navigator
  | {
      readonly type: "SET_CATEGORIES";
      readonly categories: readonly NavigatorCategory[];
    }
  | { readonly type: "SELECT_CATEGORY"; readonly index: number }
  | { readonly type: "NAVIGATE_CATEGORY"; readonly direction: "up" | "down" }
  | { readonly type: "NAVIGATE_CATEGORY_BY_OFFSET"; readonly offset: number }
  | { readonly type: "SET_NAVIGATOR_LOADING"; readonly loading: boolean }
  // Results
  | {
      readonly type: "SET_RESULTS";
      readonly items: readonly ResultItem[];
      readonly hasNextPage: boolean;
    }
  | {
      readonly type: "APPEND_RESULTS";
      readonly items: readonly ResultItem[];
      readonly hasNextPage: boolean;
    }
  | { readonly type: "SELECT_RESULT"; readonly index: number }
  | { readonly type: "NAVIGATE_RESULT"; readonly direction: "up" | "down" }
  | { readonly type: "NAVIGATE_RESULT_BY_OFFSET"; readonly offset: number }
  | { readonly type: "SET_RESULTS_LOADING"; readonly loading: boolean }
  | { readonly type: "SET_SEARCH_QUERY"; readonly query: string }
  // Detail
  | { readonly type: "SET_DETAIL_TAB"; readonly tab: DetailTab }
  | { readonly type: "NAVIGATE_TAB"; readonly direction: "previous" | "next" }
  | { readonly type: "SET_DETAIL_ITEM"; readonly item: ResultItem | undefined }
  // Command palette
  | { readonly type: "OPEN_COMMAND_PALETTE" }
  | { readonly type: "CLOSE_COMMAND_PALETTE" }
  | { readonly type: "SET_COMMAND_QUERY"; readonly query: string }
  | {
      readonly type: "NAVIGATE_COMMAND";
      readonly direction: "up" | "down";
      readonly maxIndex: number;
    }
  | { readonly type: "SELECT_COMMAND" }
  // Column picker
  | {
      readonly type: "OPEN_COLUMN_PICKER";
      readonly entityKey: Columns.EntityKey;
      readonly title: string;
    }
  | { readonly type: "CLOSE_COLUMN_PICKER" }
  // Webhook modal
  | { readonly type: "OPEN_WEBHOOK_CREATE" }
  | {
      readonly type: "OPEN_WEBHOOK_EDIT";
      readonly webhookId: string;
      readonly targetUrl: string;
      readonly selectedEvents: readonly WebhookEventType[];
    }
  | {
      readonly type: "OPEN_WEBHOOK_DELETE";
      readonly webhookId: string;
      readonly webhookUrl: string;
    }
  | { readonly type: "CLOSE_WEBHOOK_MODAL" }
  | { readonly type: "WEBHOOK_SET_URL"; readonly url: string }
  | {
      readonly type: "WEBHOOK_TOGGLE_EVENT";
      readonly eventType: WebhookEventType;
    }
  | {
      readonly type: "WEBHOOK_NAVIGATE_STEP";
      readonly direction: "next" | "previous";
    }
  // List drill-down
  | {
      readonly type: "LIST_DRILL_INTO_STATUSES";
      readonly listId: string;
      readonly listName: string;
      readonly statusAttributeSlug: string;
    }
  | {
      readonly type: "LIST_DRILL_INTO_ENTRIES";
      readonly listId: string;
      readonly listName: string;
      readonly statusId?: string;
      readonly statusTitle?: string;
      readonly statusAttributeSlug?: string;
    }
  | { readonly type: "LIST_DRILL_BACK" }
  // Object drill-down
  | {
      readonly type: "OBJECT_DRILL_INTO_RECORDS";
      readonly objectSlug: ObjectSlug;
      readonly objectName: string;
    }
  | { readonly type: "OBJECT_DRILL_BACK" };

export interface AppState {
  readonly navigation: NavigationState;
  readonly debugEnabled: boolean;
}

const INITIAL_LIST_DRILL: ListDrillState = { level: "lists" };
const INITIAL_OBJECT_DRILL: ObjectDrillState = { level: "objects" };

function resetResultsForCategoryChange(current: ResultsState): ResultsState {
  return {
    ...current,
    items: [],
    selectedIndex: 0,
    loading: true,
    hasNextPage: false,
  };
}

export function createInitialAppState(): AppState {
  return {
    navigation: createInitialNavigationState(),
    debugEnabled: false,
  };
}

function navigateIndex(
  current: number,
  direction: "up" | "down",
  maxIndex: number,
): number {
  if (direction === "up") {
    return Math.max(0, current - 1);
  }
  // Ensure index never goes negative (handles empty list where maxIndex = -1)
  return Math.max(0, Math.min(maxIndex, current + 1));
}

function navigateByOffset(
  current: number,
  offset: number,
  maxIndex: number,
): number {
  const newIndex = current + offset;
  // Clamp to valid range [0, maxIndex]
  return Math.max(0, Math.min(maxIndex, newIndex));
}

function navigateTabIndex(
  current: DetailTab,
  direction: "previous" | "next",
): DetailTab {
  const currentIndex = DETAIL_TABS.indexOf(current);
  if (direction === "previous") {
    const newIndex =
      (currentIndex - 1 + DETAIL_TABS.length) % DETAIL_TABS.length;
    return DETAIL_TABS[newIndex] ?? "summary";
  }
  const newIndex = (currentIndex + 1) % DETAIL_TABS.length;
  return DETAIL_TABS[newIndex] ?? "summary";
}

function navigatePaneIndex(
  current: PaneId,
  direction: "next" | "previous",
): PaneId {
  const currentIndex = PANE_ORDER.indexOf(current);
  if (direction === "previous") {
    const newIndex = (currentIndex - 1 + PANE_ORDER.length) % PANE_ORDER.length;
    return PANE_ORDER[newIndex] ?? "navigator";
  }
  const newIndex = (currentIndex + 1) % PANE_ORDER.length;
  return PANE_ORDER[newIndex] ?? "navigator";
}

function navigateWebhookStep(
  current: WebhookFormStep,
  direction: "next" | "previous",
): WebhookFormStep {
  const currentIndex = WEBHOOK_FORM_STEPS.indexOf(current);
  if (direction === "previous") {
    const newIndex = Math.max(0, currentIndex - 1);
    return WEBHOOK_FORM_STEPS[newIndex] ?? "url";
  }
  const newIndex = Math.min(WEBHOOK_FORM_STEPS.length - 1, currentIndex + 1);
  return WEBHOOK_FORM_STEPS[newIndex] ?? "url";
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Debug
    case "TOGGLE_DEBUG":
      return {
        ...state,
        debugEnabled: !state.debugEnabled,
      };

    case "SET_DEBUG_ENABLED":
      return {
        ...state,
        debugEnabled: action.enabled,
      };

    // Pane focus
    case "FOCUS_PANE":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          focusedPane: action.paneId,
        },
      };

    case "FOCUS_NEXT_PANE":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          focusedPane: navigatePaneIndex(state.navigation.focusedPane, "next"),
        },
      };

    case "FOCUS_PREVIOUS_PANE":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          focusedPane: navigatePaneIndex(
            state.navigation.focusedPane,
            "previous",
          ),
        },
      };

    // Navigator
    case "SET_CATEGORIES":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          navigator: {
            ...state.navigation.navigator,
            categories: action.categories,
            selectedIndex: 0,
            loading: false,
          },
        },
      };

    case "SELECT_CATEGORY":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          navigator: {
            ...state.navigation.navigator,
            selectedIndex: action.index,
          },
          results: resetResultsForCategoryChange(state.navigation.results),
          listDrill: INITIAL_LIST_DRILL,
          objectDrill: INITIAL_OBJECT_DRILL,
        },
      };

    case "NAVIGATE_CATEGORY": {
      const maxIndex = state.navigation.navigator.categories.length - 1;
      const nextIndex = navigateIndex(
        state.navigation.navigator.selectedIndex,
        action.direction,
        maxIndex,
      );
      const categoryChanged =
        nextIndex !== state.navigation.navigator.selectedIndex;
      return {
        ...state,
        navigation: {
          ...state.navigation,
          navigator: {
            ...state.navigation.navigator,
            selectedIndex: nextIndex,
          },
          ...(categoryChanged && {
            results: resetResultsForCategoryChange(state.navigation.results),
            listDrill: INITIAL_LIST_DRILL,
            objectDrill: INITIAL_OBJECT_DRILL,
          }),
        },
      };
    }

    case "NAVIGATE_CATEGORY_BY_OFFSET": {
      const maxIndex = state.navigation.navigator.categories.length - 1;
      const nextIndex = navigateByOffset(
        state.navigation.navigator.selectedIndex,
        action.offset,
        maxIndex,
      );
      const categoryChanged =
        nextIndex !== state.navigation.navigator.selectedIndex;
      return {
        ...state,
        navigation: {
          ...state.navigation,
          navigator: {
            ...state.navigation.navigator,
            selectedIndex: nextIndex,
          },
          ...(categoryChanged && {
            results: resetResultsForCategoryChange(state.navigation.results),
            listDrill: INITIAL_LIST_DRILL,
            objectDrill: INITIAL_OBJECT_DRILL,
          }),
        },
      };
    }

    case "SET_NAVIGATOR_LOADING":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          navigator: {
            ...state.navigation.navigator,
            loading: action.loading,
          },
        },
      };

    // Results
    case "SET_RESULTS":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          results: {
            ...state.navigation.results,
            items: action.items,
            hasNextPage: action.hasNextPage,
            selectedIndex: 0,
            loading: false,
          },
        },
      };

    case "APPEND_RESULTS":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          results: {
            ...state.navigation.results,
            items: [...state.navigation.results.items, ...action.items],
            hasNextPage: action.hasNextPage,
            loading: false,
          },
        },
      };

    case "SELECT_RESULT":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          results: {
            ...state.navigation.results,
            selectedIndex: action.index,
          },
        },
      };

    case "NAVIGATE_RESULT": {
      const maxIndex = state.navigation.results.items.length - 1;
      return {
        ...state,
        navigation: {
          ...state.navigation,
          results: {
            ...state.navigation.results,
            selectedIndex: navigateIndex(
              state.navigation.results.selectedIndex,
              action.direction,
              maxIndex,
            ),
          },
        },
      };
    }

    case "NAVIGATE_RESULT_BY_OFFSET": {
      const maxIndex = state.navigation.results.items.length - 1;
      return {
        ...state,
        navigation: {
          ...state.navigation,
          results: {
            ...state.navigation.results,
            selectedIndex: navigateByOffset(
              state.navigation.results.selectedIndex,
              action.offset,
              maxIndex,
            ),
          },
        },
      };
    }

    case "SET_RESULTS_LOADING":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          results: {
            ...state.navigation.results,
            loading: action.loading,
          },
        },
      };

    case "SET_SEARCH_QUERY":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          results: {
            ...state.navigation.results,
            searchQuery: action.query,
          },
        },
      };

    // Detail
    case "SET_DETAIL_TAB":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          detail: {
            ...state.navigation.detail,
            activeTab: action.tab,
          },
        },
      };

    case "NAVIGATE_TAB":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          detail: {
            ...state.navigation.detail,
            activeTab: navigateTabIndex(
              state.navigation.detail.activeTab,
              action.direction,
            ),
          },
        },
      };

    case "SET_DETAIL_ITEM":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          detail: {
            ...state.navigation.detail,
            item: action.item,
          },
        },
      };

    // Command palette
    case "OPEN_COMMAND_PALETTE":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          commandPalette: {
            ...state.navigation.commandPalette,
            isOpen: true,
            query: "",
            selectedIndex: 0,
          },
        },
      };

    case "CLOSE_COMMAND_PALETTE":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          commandPalette: {
            ...state.navigation.commandPalette,
            isOpen: false,
            query: "",
            selectedIndex: 0,
          },
        },
      };

    case "SET_COMMAND_QUERY":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          commandPalette: {
            ...state.navigation.commandPalette,
            query: action.query,
            selectedIndex: 0,
          },
        },
      };

    case "NAVIGATE_COMMAND": {
      const { maxIndex } = action;
      return {
        ...state,
        navigation: {
          ...state.navigation,
          commandPalette: {
            ...state.navigation.commandPalette,
            selectedIndex: navigateIndex(
              state.navigation.commandPalette.selectedIndex,
              action.direction,
              maxIndex,
            ),
          },
        },
      };
    }

    case "SELECT_COMMAND":
      // Command selection logic will be handled in the component
      return {
        ...state,
        navigation: {
          ...state.navigation,
          commandPalette: {
            ...state.navigation.commandPalette,
            isOpen: false,
            query: "",
            selectedIndex: 0,
          },
        },
      };

    case "OPEN_COLUMN_PICKER":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          columnPicker: {
            mode: "open",
            entityKey: action.entityKey,
            title: action.title,
          },
        },
      };

    case "CLOSE_COLUMN_PICKER":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          columnPicker: { mode: "closed" },
        },
      };

    // Webhook modal actions
    case "OPEN_WEBHOOK_CREATE":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          webhookModal: {
            mode: "create",
            step: "url",
            targetUrl: "",
            selectedEvents: [],
          },
        },
      };

    case "OPEN_WEBHOOK_EDIT":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          webhookModal: {
            mode: "edit",
            webhookId: action.webhookId,
            step: "url",
            targetUrl: action.targetUrl,
            selectedEvents: action.selectedEvents,
          },
        },
      };

    case "OPEN_WEBHOOK_DELETE":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          webhookModal: {
            mode: "delete",
            webhookId: action.webhookId,
            webhookUrl: action.webhookUrl,
          },
        },
      };

    case "CLOSE_WEBHOOK_MODAL":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          webhookModal: { mode: "closed" },
        },
      };

    case "WEBHOOK_SET_URL": {
      const { webhookModal } = state.navigation;
      if (webhookModal.mode !== "create" && webhookModal.mode !== "edit") {
        return state;
      }
      return {
        ...state,
        navigation: {
          ...state.navigation,
          webhookModal: {
            ...webhookModal,
            targetUrl: action.url,
          },
        },
      };
    }

    case "WEBHOOK_TOGGLE_EVENT": {
      const { webhookModal } = state.navigation;
      if (webhookModal.mode !== "create" && webhookModal.mode !== "edit") {
        return state;
      }
      const events = webhookModal.selectedEvents;
      const eventIndex = events.indexOf(action.eventType);
      const newEvents =
        eventIndex >= 0
          ? events.filter((e) => e !== action.eventType)
          : [...events, action.eventType];
      return {
        ...state,
        navigation: {
          ...state.navigation,
          webhookModal: {
            ...webhookModal,
            selectedEvents: newEvents,
          },
        },
      };
    }

    case "WEBHOOK_NAVIGATE_STEP": {
      const { webhookModal } = state.navigation;
      if (webhookModal.mode !== "create" && webhookModal.mode !== "edit") {
        return state;
      }
      return {
        ...state,
        navigation: {
          ...state.navigation,
          webhookModal: {
            ...webhookModal,
            step: navigateWebhookStep(webhookModal.step, action.direction),
          },
        },
      };
    }

    // List drill-down
    case "LIST_DRILL_INTO_STATUSES":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          results: resetResultsForCategoryChange(state.navigation.results),
          listDrill: {
            level: "statuses",
            listId: action.listId,
            listName: action.listName,
            statusAttributeSlug: action.statusAttributeSlug,
          },
        },
      };

    case "LIST_DRILL_INTO_ENTRIES":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          results: resetResultsForCategoryChange(state.navigation.results),
          listDrill: {
            level: "entries",
            listId: action.listId,
            listName: action.listName,
            statusId: action.statusId,
            statusTitle: action.statusTitle,
            statusAttributeSlug: action.statusAttributeSlug,
          },
        },
      };

    case "LIST_DRILL_BACK": {
      const { listDrill } = state.navigation;
      if (listDrill.level === "lists") {
        return state;
      }
      if (listDrill.level === "entries" && listDrill.statusAttributeSlug) {
        // Go back from filtered entries to statuses
        return {
          ...state,
          navigation: {
            ...state.navigation,
            results: resetResultsForCategoryChange(state.navigation.results),
            listDrill: {
              level: "statuses",
              listId: listDrill.listId,
              listName: listDrill.listName,
              statusAttributeSlug: listDrill.statusAttributeSlug,
            },
          },
        };
      }
      // Go back from entries (no status) or statuses to lists
      return {
        ...state,
        navigation: {
          ...state.navigation,
          results: resetResultsForCategoryChange(state.navigation.results),
          listDrill: INITIAL_LIST_DRILL,
        },
      };
    }

    // Object drill-down
    case "OBJECT_DRILL_INTO_RECORDS":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          results: resetResultsForCategoryChange(state.navigation.results),
          objectDrill: {
            level: "records",
            objectSlug: action.objectSlug,
            objectName: action.objectName,
          },
        },
      };

    case "OBJECT_DRILL_BACK": {
      const { objectDrill } = state.navigation;
      if (objectDrill.level === "objects") {
        return state;
      }
      return {
        ...state,
        navigation: {
          ...state.navigation,
          results: resetResultsForCategoryChange(state.navigation.results),
          objectDrill: INITIAL_OBJECT_DRILL,
        },
      };
    }
  }
}
