import type {
  ListEntryInfo,
  ListInfo,
  MeetingInfo,
  NoteInfo,
  ObjectInfo,
  RecordInfo,
  StatusInfo,
  TaskInfo,
  WebhookEventType,
  WebhookInfo,
} from "./attio.js";
import type { Columns } from "./columns.js";
import type { ListId, ObjectSlug } from "./ids.js";

// The three panes in the TUI layout
export type PaneId = "navigator" | "results" | "detail";

// Order of panes for Tab navigation
export const PANE_ORDER: readonly PaneId[] = ["navigator", "results", "detail"];

// Discriminated union for navigator categories
export type NavigatorCategory =
  | { readonly type: "object"; readonly objectSlug: ObjectSlug }
  | { readonly type: "list"; readonly listId: ListId }
  | { readonly type: "lists" }
  | { readonly type: "objects" }
  | { readonly type: "notes" }
  | { readonly type: "tasks" }
  | { readonly type: "meetings" }
  | { readonly type: "webhooks" };

// Drill-down state for the Lists browser
export type ListDrillState =
  | { readonly level: "lists" }
  | {
      readonly level: "statuses";
      readonly listId: string;
      readonly listName: string;
      readonly statusAttributeSlug: string;
    }
  | {
      readonly level: "entries";
      readonly listId: string;
      readonly listName: string;
      readonly statusId?: string;
      readonly statusTitle?: string;
      readonly statusAttributeSlug?: string;
    };

// Drill-down state for the Objects browser
export type ObjectDrillState =
  | { readonly level: "objects" }
  | {
      readonly level: "records";
      readonly objectSlug: ObjectSlug;
      readonly objectName: string;
    };

// Detail pane tabs
export type DetailTab = "summary" | "json" | "sdk" | "actions";

export const DETAIL_TABS: readonly DetailTab[] = [
  "summary",
  "json",
  "sdk",
  "actions",
];

// Maximum number of commands visible in the command palette
export const COMMAND_PALETTE_MAX_VISIBLE = 10;

// Navigator state
export interface NavigatorState {
  readonly categories: readonly NavigatorCategory[];
  readonly selectedIndex: number;
  readonly loading: boolean;
}

// Results pane state
export interface ResultsState {
  readonly items: readonly ResultItem[];
  readonly selectedIndex: number;
  readonly loading: boolean;
  readonly hasNextPage: boolean;
  readonly searchQuery: string;
}

// Result items are typed by category and backed by SDK-derived entity shapes
interface ResultItemBase<TType extends string, TData> {
  readonly type: TType;
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly data: TData;
}

export type ResultItem =
  | ResultItemBase<"object", RecordInfo>
  | ResultItemBase<"object-info", ObjectInfo>
  | ResultItemBase<"list", ListInfo>
  | ResultItemBase<"list-status", StatusInfo>
  | ResultItemBase<"list-entry", ListEntryInfo>
  | ResultItemBase<"notes", NoteInfo>
  | ResultItemBase<"tasks", TaskInfo>
  | ResultItemBase<"meetings", MeetingInfo>
  | ResultItemBase<"webhooks", WebhookInfo>;

// Detail pane state
export interface DetailState {
  readonly activeTab: DetailTab;
  readonly item: ResultItem | undefined;
}

// Command palette state
export interface CommandPaletteState {
  readonly isOpen: boolean;
  readonly query: string;
  readonly selectedIndex: number;
}

// Webhook form step
export type WebhookFormStep = "url" | "subscriptions" | "review";

export const WEBHOOK_FORM_STEPS: readonly WebhookFormStep[] = [
  "url",
  "subscriptions",
  "review",
];

// Webhook modal state using discriminated union
export type WebhookModalState =
  | { readonly mode: "closed" }
  | {
      readonly mode: "create";
      readonly step: WebhookFormStep;
      readonly targetUrl: string;
      readonly selectedEvents: readonly WebhookEventType[];
    }
  | {
      readonly mode: "edit";
      readonly webhookId: string;
      readonly step: WebhookFormStep;
      readonly targetUrl: string;
      readonly selectedEvents: readonly WebhookEventType[];
    }
  | {
      readonly mode: "delete";
      readonly webhookId: string;
      readonly webhookUrl: string;
    };

// Column picker modal state
export type ColumnPickerState =
  | { readonly mode: "closed" }
  | {
      readonly mode: "open";
      readonly entityKey: Columns.EntityKey;
      readonly title: string;
    };

// Application navigation state
export interface NavigationState {
  readonly focusedPane: PaneId;
  readonly navigator: NavigatorState;
  readonly results: ResultsState;
  readonly detail: DetailState;
  readonly commandPalette: CommandPaletteState;
  readonly webhookModal: WebhookModalState;
  readonly columnPicker: ColumnPickerState;
  readonly listDrill: ListDrillState;
  readonly objectDrill: ObjectDrillState;
}

// Generate a stable key for a NavigatorCategory
export function getNavigatorCategoryKey(category: NavigatorCategory): string {
  switch (category.type) {
    case "object":
      return `object-${category.objectSlug}`;
    case "list":
      return `list-${category.listId}`;
    case "lists":
    case "objects":
    case "notes":
    case "tasks":
    case "meetings":
    case "webhooks":
      return category.type;
  }
}

// Initial navigation state factory
export function createInitialNavigationState(): NavigationState {
  return {
    focusedPane: "navigator",
    navigator: {
      categories: [],
      selectedIndex: 0,
      loading: true,
    },
    results: {
      items: [],
      selectedIndex: 0,
      loading: false,
      hasNextPage: false,
      searchQuery: "",
    },
    detail: {
      activeTab: "summary",
      item: undefined,
    },
    commandPalette: {
      isOpen: false,
      query: "",
      selectedIndex: 0,
    },
    webhookModal: {
      mode: "closed",
    },
    columnPicker: {
      mode: "closed",
    },
    listDrill: {
      level: "lists",
    },
    objectDrill: {
      level: "objects",
    },
  };
}
