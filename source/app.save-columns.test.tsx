import { render } from "ink-testing-library";
import { type ReactNode, useEffect, useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COLUMNS } from "./constants/default-columns.js";
import type { ColumnConfig } from "./schemas/columns-schema.js";
import { parseObjectSlug } from "./types/ids.js";
import type { NavigationState } from "./types/navigation.js";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  setColumnsForEntity: vi.fn(),
  saveColumns: vi.fn(),
  showStatusMessage: vi.fn(),
  setApiKey: vi.fn(),
  refresh: vi.fn(),
  actionHandler: vi.fn(),
  webhookCreate: vi.fn(),
  webhookUpdate: vi.fn(),
  webhookDelete: vi.fn(),
  webhookClearError: vi.fn(),
}));

let navigationState: NavigationState = createNavigationState("People columns");
let nextColumns: readonly ColumnConfig[] = [{ attribute: "name" }];

interface ColumnPickerProps {
  readonly onSave: (columns: readonly ColumnConfig[]) => void;
}

function createNavigationState(title: string): NavigationState {
  return {
    focusedPane: "navigator",
    navigator: {
      categories: [{ type: "object", objectSlug: parseObjectSlug("people") }],
      selectedIndex: 0,
      loading: false,
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
      mode: "open",
      entityKey: "object-people",
      title,
    },
  };
}

async function waitForStatusMessages(count: number): Promise<void> {
  const timeoutMs = 2000;
  const intervalMs = 25;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (mocks.showStatusMessage.mock.calls.length >= count) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for status message");
}

vi.mock("./components/columns/index.js", () => ({
  ColumnPicker: ({ onSave }: ColumnPickerProps) => {
    const hasSaved = useRef(false);

    useEffect(() => {
      if (hasSaved.current) {
        return;
      }
      hasSaved.current = true;
      Promise.resolve(onSave(nextColumns)).catch(() => undefined);
    }, [onSave]);

    return null;
  },
}));

vi.mock("./hooks/use-temporary-status-message.js", () => ({
  useTemporaryStatusMessage: () => ({
    message: undefined,
    showMessage: mocks.showStatusMessage,
  }),
}));

vi.mock("./hooks/use-columns.js", () => ({
  useColumns: () => ({
    columns: DEFAULT_COLUMNS,
    loading: false,
    error: undefined,
    saveColumns: mocks.saveColumns,
    setColumnsForEntity: mocks.setColumnsForEntity,
  }),
}));

vi.mock("./hooks/use-category-data.js", () => ({
  useCategoryData: () => ({
    items: [],
    loading: false,
    error: undefined,
    hasNextPage: false,
    refresh: mocks.refresh,
  }),
}));

vi.mock("./hooks/use-action-handler.js", () => ({
  useActionHandler: () => mocks.actionHandler,
}));

vi.mock("./hooks/use-keyboard.js", () => ({
  useKeyboard: () => undefined,
}));

vi.mock("./hooks/use-webhook-operations.js", () => ({
  useWebhookOperations: () => ({
    isSubmitting: false,
    error: undefined,
    handleCreate: mocks.webhookCreate,
    handleUpdate: mocks.webhookUpdate,
    handleDelete: mocks.webhookDelete,
    clearError: mocks.webhookClearError,
  }),
}));

vi.mock("./state/context.js", () => ({
  AppProvider: ({ children }: { readonly children: ReactNode }) => children,
  useApp: () => ({
    state: { navigation: navigationState, debugEnabled: false },
    dispatch: mocks.dispatch,
  }),
}));

vi.mock("./state/client-context.js", () => ({
  ClientProvider: ({ children }: { readonly children: ReactNode }) => children,
  useClient: () => ({
    client: undefined,
    configState: { status: "ready", isConfigured: true },
    setApiKey: mocks.setApiKey,
  }),
}));

import App from "./app.js";

describe("App column save status messages", () => {
  beforeEach(() => {
    mocks.dispatch.mockReset();
    mocks.setColumnsForEntity.mockReset();
    mocks.saveColumns.mockReset();
    mocks.showStatusMessage.mockReset();
    mocks.setApiKey.mockReset();
    mocks.refresh.mockReset();
    mocks.actionHandler.mockReset();
    mocks.webhookCreate.mockReset();
    mocks.webhookUpdate.mockReset();
    mocks.webhookDelete.mockReset();
    mocks.webhookClearError.mockReset();
    navigationState = createNavigationState("People columns");
    nextColumns = [{ attribute: "name" }];
  });

  it("shows a success message after columns save succeeds", async () => {
    mocks.setColumnsForEntity.mockImplementation(() => undefined);

    const instance = render(<App />);

    try {
      await waitForStatusMessages(1);
      expect(mocks.showStatusMessage).toHaveBeenCalledTimes(1);
      expect(mocks.showStatusMessage).toHaveBeenCalledWith({
        tone: "info",
        text: "Saved People columns",
      });
    } finally {
      instance.cleanup();
    }
  });

  it("shows an error message when columns save fails", async () => {
    mocks.setColumnsForEntity.mockImplementation(() => {
      throw new Error("Disk full");
    });

    const instance = render(<App />);

    try {
      await waitForStatusMessages(1);
      expect(mocks.showStatusMessage).toHaveBeenCalledTimes(1);
      expect(mocks.showStatusMessage).toHaveBeenCalledWith({
        tone: "error",
        text: "Failed to save People columns: Disk full",
      });
      expect(mocks.showStatusMessage).not.toHaveBeenCalledWith({
        tone: "info",
        text: "Saved People columns",
      });
    } finally {
      instance.cleanup();
    }
  });
});
