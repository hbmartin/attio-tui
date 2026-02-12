import { join } from "node:path";
import process from "node:process";
import { Box, Text, useApp as useInkApp, useStdin, useStdout } from "ink";
import {
  type JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ColumnPicker } from "./components/columns/index.js";
import { CommandPalette } from "./components/command-palette/command-palette.js";
import { DebugPanel } from "./components/debug/debug-panel.js";
import { DetailPane } from "./components/detail/detail-pane.js";
import { HelpOverlay } from "./components/help/index.js";
import { StatusBar } from "./components/layout/status-bar.js";
import { ThreePaneLayout } from "./components/layout/three-pane-layout.js";
import { Navigator } from "./components/navigator/navigator.js";
import { ResultsPane } from "./components/results/results-pane.js";
import { ApiKeyPrompt } from "./components/setup/api-key-prompt.js";
import {
  WebhookDeleteConfirm,
  WebhookForm,
} from "./components/webhooks/index.js";
import { DEFAULT_COMMANDS, filterCommands } from "./constants/commands.js";
import { useAccessibility } from "./hooks/use-accessibility.js";
import { useActionHandler } from "./hooks/use-action-handler.js";
import { useCategoryData } from "./hooks/use-category-data.js";
import { useColumns } from "./hooks/use-columns.js";
import { useKeyboard } from "./hooks/use-keyboard.js";
import { useListDrill } from "./hooks/use-list-drill.js";
import { useTemporaryStatusMessage } from "./hooks/use-temporary-status-message.js";
import { useWebhookOperations } from "./hooks/use-webhook-operations.js";
import type { ColumnConfig } from "./schemas/columns-schema.js";
import { createInitialAppState } from "./state/app-state.js";
import {
  ClientProvider,
  type ConfigState,
  useClient,
} from "./state/client-context.js";
import { AppProvider, useApp } from "./state/context.js";
import { Columns } from "./types/columns.js";
import type { ActionId, Command } from "./types/commands.js";
import type {
  DebugRequestLogEntry,
  DebugRequestLogEntryInput,
  DebugStateSnapshot,
  DebugTimingSnapshot,
} from "./types/debug.js";
import { type ObjectSlug, parseObjectSlug } from "./types/ids.js";
import {
  COMMAND_PALETTE_MAX_VISIBLE,
  type ListDrillState,
  type NavigatorCategory,
} from "./types/navigation.js";
import { writeToClipboard } from "./utils/clipboard.js";
import {
  getAvailableColumns,
  getColumnsConfig,
  getDefaultColumns,
  resolveColumns,
} from "./utils/columns.js";
import { exportJsonToFile } from "./utils/export.js";
import { openBrowser } from "./utils/open-browser.js";
import { PtyDebug } from "./utils/pty-debug.js";

// Static categories for the skeleton - will be replaced with dynamic loading
function getStaticCategories(): readonly NavigatorCategory[] {
  return [
    { type: "object", objectSlug: parseObjectSlug("companies") },
    { type: "object", objectSlug: parseObjectSlug("people") },
    { type: "lists" },
    { type: "notes" },
    { type: "tasks" },
    { type: "meetings" },
    { type: "webhooks" },
  ];
}

// Build breadcrumb for lists drill-down
function getListsBreadcrumb(listDrill: ListDrillState): string {
  if (listDrill.level === "lists") {
    return "Lists";
  }
  if (listDrill.level === "statuses") {
    return `Lists > ${listDrill.listName}`;
  }
  const parts = ["Lists", listDrill.listName];
  if (listDrill.statusTitle) {
    parts.push(listDrill.statusTitle);
  }
  return parts.join(" > ");
}

// Get category label for display
function getCategoryLabel(
  category: NavigatorCategory | undefined,
  listDrill?: ListDrillState,
): string | undefined {
  if (!category) {
    return;
  }
  switch (category.type) {
    case "object":
      return category.objectSlug;
    case "list":
      return "List";
    case "lists":
      return listDrill ? getListsBreadcrumb(listDrill) : "Lists";
    case "notes":
      return "Notes";
    case "tasks":
      return "Tasks";
    case "meetings":
      return "Meetings";
    case "webhooks":
      return "Webhooks";
  }
}

// Get category type for data loading
function getCategoryType(
  category: NavigatorCategory | undefined,
): NavigatorCategory["type"] {
  return category?.type ?? "object";
}

// Get category slug for objects
function getCategorySlug(
  category: NavigatorCategory | undefined,
): ObjectSlug | undefined {
  if (category?.type === "object") {
    return category.objectSlug;
  }
  return;
}

function usePtyDebugInk(): void {
  const { stdout } = useStdout();
  const { stdin, isRawModeSupported } = useStdin();

  useEffect(() => {
    PtyDebug.log(
      `ink stdout isTTY=${Boolean(stdout.isTTY)} columns=${stdout.columns ?? "<unset>"} rows=${stdout.rows ?? "<unset>"}`,
    );
    PtyDebug.log(
      `ink stdin isTTY=${Boolean(stdin.isTTY)} isRawModeSupported=${String(isRawModeSupported)} isRaw=${String(stdin.isRaw)}`,
    );
  }, [stdout, stdin, isRawModeSupported]);
}

function MainApp() {
  const { state, dispatch } = useApp();
  const { debugEnabled } = state;
  const { isScreenReaderEnabled } = useAccessibility();
  const { client } = useClient();
  const { exit } = useInkApp();
  const { message: statusMessage, showMessage: showStatusMessage } =
    useTemporaryStatusMessage({ timeoutMs: 3000 });
  const handleRefreshError = useCallback(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      showStatusMessage({
        text: `Refresh failed: ${message}`,
        tone: "error",
      });
    },
    [showStatusMessage],
  );
  const appStartRef = useRef(Date.now());
  const requestIdRef = useRef(0);
  const ptyDebugEnabled = PtyDebug.isEnabled();
  const ptyLogPath = PtyDebug.getLogPath();
  const [requestLog, setRequestLog] = useState<readonly DebugRequestLogEntry[]>(
    [],
  );
  const recordRequest = useCallback((entry: DebugRequestLogEntryInput) => {
    const nextEntry: DebugRequestLogEntry = {
      id: String(requestIdRef.current),
      ...entry,
    };
    requestIdRef.current += 1;
    setRequestLog((prev) => [nextEntry, ...prev].slice(0, 20));
  }, []);
  const {
    columns: columnsConfig,
    error: columnsError,
    setColumnsForEntity,
  } = useColumns();

  const { navigation } = state;
  const {
    focusedPane,
    navigator: {
      categories: navigatorCategories,
      selectedIndex: navigatorSelectedIndex,
      loading: navigatorLoading,
    },
    results: {
      items: resultItems,
      selectedIndex: resultSelectedIndex,
      loading: resultsLoading,
      hasNextPage: resultsHasNextPage,
    },
    detail: { activeTab: detailActiveTab, item: detailItem },
    commandPalette: {
      isOpen: commandPaletteOpen,
      query: commandPaletteQuery,
      selectedIndex: commandPaletteSelectedIndex,
    },
    webhookModal,
    columnPicker,
    listDrill,
  } = navigation;
  const { mode: webhookModalMode } = webhookModal;
  const { mode: columnPickerMode } = columnPicker;

  // Help overlay state
  const [helpOverlayOpen, setHelpOverlayOpen] = useState(false);
  const toggleHelp = useCallback(() => {
    setHelpOverlayOpen((prev) => !prev);
  }, []);
  const closeHelp = useCallback(() => {
    setHelpOverlayOpen(false);
  }, []);

  // Get selected category
  const selectedCategory = navigatorCategories[navigatorSelectedIndex];

  // List drill-down
  const { drillIntoList, drillIntoStatus } = useListDrill({
    client,
    dispatch,
  });

  const handleSelectItem = useCallback(() => {
    if (focusedPane !== "results") {
      return;
    }
    const selectedItem = resultItems[resultSelectedIndex];
    if (!selectedItem) {
      return;
    }

    if (selectedItem.type === "list" && selectedCategory?.type === "lists") {
      drillIntoList(selectedItem.data);
    } else if (selectedItem.type === "list-status") {
      if (listDrill.level === "statuses") {
        drillIntoStatus({
          listId: listDrill.listId,
          listName: listDrill.listName,
          statusAttributeSlug: listDrill.statusAttributeSlug,
          status: selectedItem.data,
        });
      }
    } else {
      // For non-drillable items, focus the detail pane
      dispatch({ type: "FOCUS_PANE", paneId: "detail" });
    }
  }, [
    focusedPane,
    resultItems,
    resultSelectedIndex,
    selectedCategory,
    listDrill,
    drillIntoList,
    drillIntoStatus,
    dispatch,
  ]);

  const handleGoBack = useCallback(() => {
    if (selectedCategory?.type === "lists" && listDrill.level !== "lists") {
      dispatch({ type: "LIST_DRILL_BACK" });
    } else if (focusedPane === "results") {
      dispatch({ type: "FOCUS_PANE", paneId: "navigator" });
    } else if (focusedPane === "detail") {
      dispatch({ type: "FOCUS_PANE", paneId: "results" });
    }
  }, [selectedCategory, listDrill, focusedPane, dispatch]);

  const categoryLabel = getCategoryLabel(selectedCategory, listDrill);
  const categoryType = getCategoryType(selectedCategory);
  const categorySlug = getCategorySlug(selectedCategory);
  const columnsEntityKey = Columns.getEntityKey(selectedCategory);
  const resolvedColumns = resolveColumns({
    entityKey: columnsEntityKey,
    columnsConfig,
  });

  useEffect(() => {
    if (columnsError) {
      showStatusMessage({ tone: "error", text: columnsError });
    }
  }, [columnsError, showStatusMessage]);

  // Load data for the current category
  const {
    items: categoryItems,
    loading: categoryLoading,
    error: categoryError,
    hasNextPage,
    lastUpdatedAt,
    refresh,
    checkPrefetch,
  } = useCategoryData({
    client,
    categoryType,
    categorySlug,
    listDrill: categoryType === "lists" ? listDrill : undefined,
    onRequestLog: recordRequest,
  });
  const refreshWithFeedback = useCallback((): void => {
    refresh().catch(handleRefreshError);
  }, [refresh, handleRefreshError]);

  // Webhook operations
  const webhookOps = useWebhookOperations({
    client,
    dispatch,
    onSuccess: refreshWithFeedback,
    onRequestLog: recordRequest,
  });

  // Initialize categories on mount
  useEffect(() => {
    dispatch({ type: "SET_CATEGORIES", categories: getStaticCategories() });
  }, [dispatch]);

  // Update results when category data changes
  useEffect(() => {
    dispatch({
      type: "SET_RESULTS",
      items: categoryItems,
      hasNextPage,
    });
  }, [categoryItems, hasNextPage, dispatch]);

  // Update results loading state
  useEffect(() => {
    dispatch({ type: "SET_RESULTS_LOADING", loading: categoryLoading });
  }, [categoryLoading, dispatch]);

  // Update detail item when result selection changes
  useEffect(() => {
    const selectedItem = resultItems[resultSelectedIndex];
    dispatch({ type: "SET_DETAIL_ITEM", item: selectedItem });
  }, [resultItems, resultSelectedIndex, dispatch]);

  const isWebhookModalOpen = webhookModalMode !== "closed";
  const isColumnPickerOpen = columnPickerMode === "open";
  const isKeyboardEnabled = !(
    isWebhookModalOpen ||
    isColumnPickerOpen ||
    helpOverlayOpen
  );
  const { entityKey: columnPickerEntityKey, title: columnPickerTitle } =
    columnPickerMode === "open"
      ? columnPicker
      : { entityKey: columnsEntityKey, title: "Columns" };
  const columnPickerData = useMemo(() => {
    if (columnPickerMode !== "open") {
      return;
    }

    return {
      available: getAvailableColumns({ entityKey: columnPickerEntityKey }),
      selected: getColumnsConfig({
        entityKey: columnPickerEntityKey,
        columnsConfig,
      }),
      defaults: getDefaultColumns({ entityKey: columnPickerEntityKey }),
    };
  }, [columnPickerMode, columnPickerEntityKey, columnsConfig]);

  const columnPickerAvailable = columnPickerData?.available ?? [];
  const columnPickerSelected = columnPickerData?.selected ?? [];
  const columnPickerDefaults = columnPickerData?.defaults ?? [];

  const handleSaveColumns = useCallback(
    async (nextColumns: readonly ColumnConfig[]) => {
      if (columnPickerMode !== "open") {
        return;
      }

      const { entityKey, title } = columnPicker;

      try {
        await setColumnsForEntity(entityKey, nextColumns);
        showStatusMessage({
          tone: "info",
          text: `Saved ${title}`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        showStatusMessage({
          tone: "error",
          text: `Failed to save ${title}: ${message}`,
        });
      }
    },
    [columnPicker, columnPickerMode, setColumnsForEntity, showStatusMessage],
  );

  const openColumnsPicker = useCallback(() => {
    const entityKey =
      Columns.getEntityKey(selectedCategory) ?? Columns.DEFAULT_OBJECT_KEY;
    const title = categoryLabel ?? "Results";
    dispatch({
      type: "OPEN_COLUMN_PICKER",
      entityKey,
      title: `Columns: ${title}`,
    });
  }, [dispatch, selectedCategory, categoryLabel]);

  const copySelectedId = useCallback((): void => {
    const selectedItem = resultItems[resultSelectedIndex];
    if (!selectedItem) {
      showStatusMessage({ tone: "error", text: "No item selected" });
      return;
    }

    const { id } = selectedItem;

    writeToClipboard({ text: id })
      .then(() => {
        showStatusMessage({ tone: "info", text: "Copied ID to clipboard" });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        showStatusMessage({ tone: "error", text: `Copy failed: ${message}` });
      });
  }, [resultItems, resultSelectedIndex, showStatusMessage]);

  const openSelectedItem = useCallback((): void => {
    const selectedItem = resultItems[resultSelectedIndex];
    if (!selectedItem) {
      showStatusMessage({ tone: "error", text: "No item selected" });
      return;
    }

    const { type, data } = selectedItem;
    const url = type === "object" ? data.webUrl : undefined;
    if (!url) {
      showStatusMessage({
        tone: "error",
        text: "No web URL available for the selected item",
      });
      return;
    }

    openBrowser({ url })
      .then(() => {
        showStatusMessage({ tone: "info", text: "Opened in browser" });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        showStatusMessage({ tone: "error", text: `Open failed: ${message}` });
      });
  }, [resultItems, resultSelectedIndex, showStatusMessage]);

  const exportSelectedItem = useCallback((): void => {
    const selectedItem = resultItems[resultSelectedIndex];
    if (!selectedItem) {
      showStatusMessage({ tone: "error", text: "No item selected" });
      return;
    }

    const { id, type, data } = selectedItem;
    const fileName = `attio-${type}-${id}.json`;
    const filePath = join(process.cwd(), fileName);

    exportJsonToFile({ data, filePath })
      .then(() => {
        showStatusMessage({
          tone: "info",
          text: `Exported JSON to ${filePath}`,
        });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        showStatusMessage({ tone: "error", text: `Export failed: ${message}` });
      });
  }, [resultItems, resultSelectedIndex, showStatusMessage]);

  const toggleDebugPanel = useCallback(() => {
    const nextEnabled = !debugEnabled;
    dispatch({ type: "SET_DEBUG_ENABLED", enabled: nextEnabled });
    showStatusMessage({
      tone: "info",
      text: nextEnabled ? "Debug panel enabled" : "Debug panel disabled",
    });
  }, [dispatch, showStatusMessage, debugEnabled]);

  // Filter commands for command palette
  const filteredCommands = filterCommands(
    DEFAULT_COMMANDS,
    commandPaletteQuery,
  );
  const commandPaletteVisibleCount = Math.min(
    filteredCommands.length,
    COMMAND_PALETTE_MAX_VISIBLE,
  );
  const commandPaletteMaxIndex = Math.max(0, commandPaletteVisibleCount - 1);

  // Handle keyboard actions
  const handleAction = useActionHandler({
    focusedPane,
    commandPaletteOpen,
    commandPaletteMaxIndex,
    navigatorItemCount: navigatorCategories.length,
    resultsItemCount: resultItems.length,
    dispatch,
    exit,
    onCopyId: copySelectedId,
    onOpenInBrowser: openSelectedItem,
    onRefresh: refreshWithFeedback,
    onToggleDebug: toggleDebugPanel,
    onToggleHelp: toggleHelp,
    onSelectItem: handleSelectItem,
    onGoBack: handleGoBack,
  });

  // Setup keyboard handling (disabled when webhook modal is open)
  useKeyboard({
    focusedPane,
    commandPaletteOpen,
    onAction: handleAction,
    enabled: isKeyboardEnabled,
  });

  useEffect(() => {
    if (categoryItems.length === 0) {
      return;
    }
    checkPrefetch(resultSelectedIndex);
  }, [categoryItems.length, checkPrefetch, resultSelectedIndex]);

  // Handle webhook commands - defined before executeCommand since it's used there
  const handleWebhookCommand = useCallback(
    (webhookAction: "create" | "edit" | "delete") => {
      const selectedItem = resultItems[resultSelectedIndex];

      switch (webhookAction) {
        case "create":
          dispatch({ type: "OPEN_WEBHOOK_CREATE" });
          break;

        case "edit":
          if (selectedItem?.type === "webhooks") {
            const { id, targetUrl, subscriptions } = selectedItem.data;
            dispatch({
              type: "OPEN_WEBHOOK_EDIT",
              webhookId: id,
              targetUrl,
              selectedEvents: subscriptions.map(
                (subscription) => subscription.eventType,
              ),
            });
          }
          break;

        case "delete":
          if (selectedItem?.type === "webhooks") {
            const { id, targetUrl } = selectedItem.data;
            dispatch({
              type: "OPEN_WEBHOOK_DELETE",
              webhookId: id,
              webhookUrl: targetUrl,
            });
          }
          break;
      }
    },
    [resultItems, resultSelectedIndex, dispatch],
  );

  // Execute command from command palette
  const executeCommand = useCallback(
    (command: Command) => {
      dispatch({ type: "CLOSE_COMMAND_PALETTE" });

      switch (command.action.type) {
        case "navigation": {
          const { target } = command.action;
          const targetIndex = navigatorCategories.findIndex((cat) => {
            if (cat.type === "object") {
              return cat.objectSlug === target;
            }
            return cat.type === target;
          });
          if (targetIndex >= 0) {
            dispatch({ type: "SELECT_CATEGORY", index: targetIndex });
          }
          break;
        }

        case "action": {
          const actionHandlers: Record<ActionId, () => void> = {
            copyId: copySelectedId,
            openInBrowser: openSelectedItem,
            refresh: refreshWithFeedback,
            exportJson: exportSelectedItem,
            help: () => {
              showStatusMessage({
                tone: "info",
                text: "Use : to open commands or Ctrl+O/C to open or copy.",
              });
            },
            columns: openColumnsPicker,
            quit: exit,
          };

          const handler = actionHandlers[command.action.actionId];
          handler();
          break;
        }

        case "toggle":
          if (command.action.toggleId === "debug") {
            toggleDebugPanel();
          }
          break;

        case "webhook":
          handleWebhookCommand(command.action.webhookAction);
          break;
      }
    },
    [
      dispatch,
      navigatorCategories,
      exit,
      handleWebhookCommand,
      refreshWithFeedback,
      copySelectedId,
      openSelectedItem,
      exportSelectedItem,
      openColumnsPicker,
      showStatusMessage,
      toggleDebugPanel,
    ],
  );

  // Handle webhook form submission
  const handleWebhookSubmit = useCallback(() => {
    if (webhookModalMode === "create") {
      const { targetUrl, selectedEvents } = webhookModal;
      webhookOps.handleCreate(targetUrl, selectedEvents);
    } else if (webhookModalMode === "edit") {
      const { webhookId, targetUrl, selectedEvents } = webhookModal;
      webhookOps.handleUpdate({
        webhookId,
        targetUrl,
        selectedEvents,
      });
    }
  }, [webhookModal, webhookModalMode, webhookOps]);

  // Handle webhook delete confirmation
  const handleWebhookDeleteConfirm = useCallback(() => {
    if (webhookModalMode === "delete") {
      const { webhookId } = webhookModal;
      webhookOps.handleDelete(webhookId);
    }
  }, [webhookModal, webhookModalMode, webhookOps]);

  const debugTiming = useMemo<DebugTimingSnapshot>(() => {
    const [lastRequest] = requestLog;
    return {
      appStartedAt: appStartRef.current,
      lastRequestAt: lastRequest?.startedAt,
      lastRequestDurationMs: lastRequest?.durationMs,
    };
  }, [requestLog]);

  const debugStateSnapshot = useMemo<DebugStateSnapshot>(
    () => ({
      focusedPane,
      activeTab: detailActiveTab,
      commandPaletteOpen,
      resultsCount: resultItems.length,
      selectedIndex: resultSelectedIndex,
      categoryLabel,
      navigatorLoading,
      resultsLoading,
      columnPickerOpen: columnPickerMode === "open",
      webhookModalMode,
      debugEnabled,
    }),
    [
      focusedPane,
      detailActiveTab,
      commandPaletteOpen,
      resultItems.length,
      resultSelectedIndex,
      categoryLabel,
      navigatorLoading,
      resultsLoading,
      columnPickerMode,
      webhookModalMode,
      debugEnabled,
    ],
  );

  return (
    <Box flexDirection="column" height="100%">
      <ThreePaneLayout
        navigator={
          <Navigator
            categories={navigatorCategories}
            selectedIndex={navigatorSelectedIndex}
            focused={focusedPane === "navigator"}
            loading={navigatorLoading}
          />
        }
        results={
          <ResultsPane
            items={resultItems}
            selectedIndex={resultSelectedIndex}
            focused={focusedPane === "results"}
            loading={resultsLoading}
            hasNextPage={resultsHasNextPage}
            categoryLabel={categoryLabel}
            error={categoryError}
            columns={resolvedColumns}
          />
        }
        detail={
          <DetailPane
            item={detailItem}
            activeTab={detailActiveTab}
            focused={focusedPane === "detail"}
            category={selectedCategory}
          />
        }
        statusBar={
          <StatusBar
            focusedPane={focusedPane}
            itemCount={resultItems.length}
            selectedIndex={resultSelectedIndex}
            loading={navigatorLoading || resultsLoading}
            statusMessage={statusMessage}
            debugEnabled={debugEnabled}
            lastUpdatedAt={lastUpdatedAt}
          />
        }
      />

      {debugEnabled && (
        <DebugPanel
          requestLog={requestLog}
          timing={debugTiming}
          state={debugStateSnapshot}
          ptyDebugEnabled={ptyDebugEnabled}
          ptyLogPath={ptyLogPath}
          accessibleMode={isScreenReaderEnabled}
        />
      )}

      <CommandPalette
        isOpen={commandPaletteOpen}
        query={commandPaletteQuery}
        commands={filteredCommands}
        selectedIndex={commandPaletteSelectedIndex}
        onExecute={executeCommand}
        onQueryChange={(query) =>
          dispatch({ type: "SET_COMMAND_QUERY", query })
        }
      />

      {columnPickerMode === "open" && (
        <ColumnPicker
          title={columnPickerTitle}
          availableColumns={columnPickerAvailable}
          selectedColumns={columnPickerSelected}
          defaultColumns={columnPickerDefaults}
          onSave={handleSaveColumns}
          onClose={() => dispatch({ type: "CLOSE_COLUMN_PICKER" })}
        />
      )}

      {(webhookModalMode === "create" || webhookModalMode === "edit") && (
        <WebhookForm
          mode={webhookModal.mode}
          step={webhookModal.step}
          targetUrl={webhookModal.targetUrl}
          selectedEvents={webhookModal.selectedEvents}
          onUrlChange={(url) => dispatch({ type: "WEBHOOK_SET_URL", url })}
          onToggleEvent={(eventType) =>
            dispatch({ type: "WEBHOOK_TOGGLE_EVENT", eventType })
          }
          onNavigateStep={(direction) =>
            dispatch({ type: "WEBHOOK_NAVIGATE_STEP", direction })
          }
          onSubmit={handleWebhookSubmit}
          onCancel={() => dispatch({ type: "CLOSE_WEBHOOK_MODAL" })}
          isSubmitting={webhookOps.isSubmitting}
          error={webhookOps.error}
        />
      )}

      {webhookModalMode === "delete" && (
        <WebhookDeleteConfirm
          webhookUrl={webhookModal.webhookUrl}
          onConfirm={handleWebhookDeleteConfirm}
          onCancel={() => dispatch({ type: "CLOSE_WEBHOOK_MODAL" })}
          isDeleting={webhookOps.isSubmitting}
        />
      )}

      <HelpOverlay isOpen={helpOverlayOpen} onClose={closeHelp} onQuit={exit} />
    </Box>
  );
}

function AppWithClient() {
  const { configState, setApiKey } = useClient();

  const errorMessage =
    configState.status === "error" ? configState.error : "Unknown error";
  const isConfigured =
    configState.status === "ready" ? configState.isConfigured : false;

  useEffect(() => {
    if (configState.status === "error") {
      PtyDebug.log(`config status=error message=${errorMessage}`);
      return;
    }
    PtyDebug.log(
      `config status=${configState.status} isConfigured=${String(isConfigured)}`,
    );
  }, [configState.status, errorMessage, isConfigured]);

  const renderByStatus = {
    loading: () => (
      <Box padding={1} width="100%" height="100%" flexDirection="column">
        <Text color="yellow">Loading configuration...</Text>
      </Box>
    ),
    error: () => (
      <Box padding={1} width="100%" height="100%" flexDirection="column">
        <Text color="red">Error: {errorMessage}</Text>
      </Box>
    ),
    ready: () =>
      isConfigured ? <MainApp /> : <ApiKeyPrompt onSubmit={setApiKey} />,
  } satisfies Record<ConfigState["status"], () => JSX.Element>;

  return renderByStatus[configState.status]();
}

interface AppProps {
  readonly initialDebugEnabled?: boolean;
}

export default function App({ initialDebugEnabled }: AppProps) {
  const initialState = useMemo(() => {
    if (initialDebugEnabled === undefined) {
      return;
    }
    return {
      ...createInitialAppState(),
      debugEnabled: initialDebugEnabled,
    };
  }, [initialDebugEnabled]);

  usePtyDebugInk();
  useEffect(() => {
    PtyDebug.log("app mount");
    return () => {
      PtyDebug.log("app unmount");
    };
  }, []);

  return (
    <ClientProvider>
      <AppProvider initialState={initialState}>
        <AppWithClient />
      </AppProvider>
    </ClientProvider>
  );
}
