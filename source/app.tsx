import { Box, Text, useApp as useInkApp } from "ink";
import { useCallback, useEffect } from "react";
import { CommandPalette } from "./components/command-palette/command-palette.js";
import { DetailPane } from "./components/detail/detail-pane.js";
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
import { useActionHandler } from "./hooks/use-action-handler.js";
import { useCategoryData } from "./hooks/use-category-data.js";
import { useKeyboard } from "./hooks/use-keyboard.js";
import { useTemporaryStatusMessage } from "./hooks/use-temporary-status-message.js";
import { useWebhookOperations } from "./hooks/use-webhook-operations.js";
import {
  ClientProvider,
  type ConfigState,
  useClient,
} from "./state/client-context.js";
import { AppProvider, useApp } from "./state/context.js";
import type { Command } from "./types/commands.js";
import { type ObjectSlug, parseObjectSlug } from "./types/ids.js";
import type { NavigatorCategory } from "./types/navigation.js";

// Static categories for the skeleton - will be replaced with dynamic loading
function getStaticCategories(): readonly NavigatorCategory[] {
  return [
    { type: "object", objectSlug: parseObjectSlug("companies") },
    { type: "object", objectSlug: parseObjectSlug("people") },
    { type: "notes" },
    { type: "tasks" },
    { type: "meetings" },
    { type: "webhooks" },
  ];
}

// Get category label for display
function getCategoryLabel(
  category: NavigatorCategory | undefined,
): string | undefined {
  if (!category) {
    return;
  }
  switch (category.type) {
    case "object":
      return category.objectSlug;
    case "list":
      return "List";
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

function MainApp() {
  const { state, dispatch } = useApp();
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

  const { navigation } = state;
  const {
    focusedPane,
    navigator,
    results,
    detail,
    commandPalette,
    webhookModal,
  } = navigation;

  // Get selected category
  const selectedCategory = navigator.categories[navigator.selectedIndex];
  const categoryType = getCategoryType(selectedCategory);
  const categorySlug = getCategorySlug(selectedCategory);

  // Load data for the current category
  const {
    items: categoryItems,
    loading: categoryLoading,
    error: categoryError,
    hasNextPage,
    refresh,
  } = useCategoryData({
    client,
    categoryType,
    categorySlug,
  });
  const refreshWithFeedback = useCallback((): void => {
    refresh().catch(handleRefreshError);
  }, [refresh, handleRefreshError]);

  // Webhook operations
  const webhookOps = useWebhookOperations({
    client,
    dispatch,
    onSuccess: refreshWithFeedback,
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
    const selectedItem = results.items[results.selectedIndex];
    dispatch({ type: "SET_DETAIL_ITEM", item: selectedItem });
  }, [results.items, results.selectedIndex, dispatch]);

  // Check if webhook modal is open (blocks other keyboard input)
  const isWebhookModalOpen = webhookModal.mode !== "closed";

  // Handle keyboard actions
  const handleAction = useActionHandler({
    focusedPane,
    dispatch,
    exit,
  });

  // Setup keyboard handling (disabled when webhook modal is open)
  useKeyboard({
    focusedPane,
    commandPaletteOpen: commandPalette.isOpen,
    onAction: handleAction,
    enabled: !isWebhookModalOpen,
  });

  // Filter commands for command palette
  const filteredCommands = filterCommands(
    DEFAULT_COMMANDS,
    commandPalette.query,
  );

  // Handle webhook commands - defined before executeCommand since it's used there
  const handleWebhookCommand = useCallback(
    (webhookAction: "create" | "edit" | "delete") => {
      const selectedItem = results.items[results.selectedIndex];

      switch (webhookAction) {
        case "create":
          dispatch({ type: "OPEN_WEBHOOK_CREATE" });
          break;

        case "edit":
          if (selectedItem?.type === "webhooks") {
            const webhookData = selectedItem.data;
            dispatch({
              type: "OPEN_WEBHOOK_EDIT",
              webhookId: webhookData.id,
              targetUrl: webhookData.targetUrl,
              selectedEvents: webhookData.subscriptions.map((s) => s.eventType),
            });
          }
          break;

        case "delete":
          if (selectedItem?.type === "webhooks") {
            const webhookData = selectedItem.data;
            dispatch({
              type: "OPEN_WEBHOOK_DELETE",
              webhookId: webhookData.id,
              webhookUrl: webhookData.targetUrl,
            });
          }
          break;
      }
    },
    [results.items, results.selectedIndex, dispatch],
  );

  // Execute command from command palette
  const executeCommand = useCallback(
    (command: Command) => {
      dispatch({ type: "CLOSE_COMMAND_PALETTE" });

      switch (command.action.type) {
        case "navigation": {
          const { target } = command.action;
          const targetIndex = navigator.categories.findIndex((cat) => {
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

        case "action":
          if (command.action.actionId === "quit") {
            exit();
          } else if (command.action.actionId === "refresh") {
            refreshWithFeedback();
          }
          break;

        case "toggle":
          // Toggle commands - not yet implemented
          break;

        case "webhook":
          handleWebhookCommand(command.action.webhookAction);
          break;
      }
    },
    [dispatch, navigator.categories, exit, refreshWithFeedback, handleWebhookCommand],
  );

  // Handle webhook form submission
  const handleWebhookSubmit = useCallback(() => {
    if (webhookModal.mode === "create") {
      webhookOps.handleCreate(
        webhookModal.targetUrl,
        webhookModal.selectedEvents,
      );
    } else if (webhookModal.mode === "edit") {
      webhookOps.handleUpdate(
        webhookModal.webhookId,
        webhookModal.targetUrl,
        webhookModal.selectedEvents,
      );
    }
  }, [webhookModal, webhookOps]);

  // Handle webhook delete confirmation
  const handleWebhookDeleteConfirm = useCallback(() => {
    if (webhookModal.mode === "delete") {
      webhookOps.handleDelete(webhookModal.webhookId);
    }
  }, [webhookModal, webhookOps]);

  return (
    <Box flexDirection="column" height="100%">
      <ThreePaneLayout
        navigator={
          <Navigator
            categories={navigator.categories}
            selectedIndex={navigator.selectedIndex}
            focused={focusedPane === "navigator"}
            loading={navigator.loading}
          />
        }
        results={
          <ResultsPane
            items={results.items}
            selectedIndex={results.selectedIndex}
            focused={focusedPane === "results"}
            loading={results.loading}
            hasNextPage={results.hasNextPage}
            categoryLabel={getCategoryLabel(selectedCategory)}
            error={categoryError}
          />
        }
        detail={
          <DetailPane
            item={detail.item}
            activeTab={detail.activeTab}
            focused={focusedPane === "detail"}
            category={selectedCategory}
          />
        }
        statusBar={
          <StatusBar
            focusedPane={focusedPane}
            itemCount={results.items.length}
            selectedIndex={results.selectedIndex}
            loading={navigator.loading || results.loading}
            statusMessage={statusMessage}
          />
        }
      />

      <CommandPalette
        isOpen={commandPalette.isOpen}
        query={commandPalette.query}
        commands={filteredCommands}
        selectedIndex={commandPalette.selectedIndex}
        onExecute={executeCommand}
      />

      {(webhookModal.mode === "create" || webhookModal.mode === "edit") && (
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

      {webhookModal.mode === "delete" && (
        <WebhookDeleteConfirm
          webhookUrl={webhookModal.webhookUrl}
          onConfirm={handleWebhookDeleteConfirm}
          onCancel={() => dispatch({ type: "CLOSE_WEBHOOK_MODAL" })}
          isDeleting={webhookOps.isSubmitting}
        />
      )}
    </Box>
  );
}

function AppWithClient() {
  const { configState, setApiKey } = useClient();

  const errorMessage =
    configState.status === "error" ? configState.error : "Unknown error";
  const isConfigured =
    configState.status === "ready" ? configState.isConfigured : false;

  const renderByStatus = {
    loading: () => (
      <Box padding={1}>
        <Text color="yellow">Loading configuration...</Text>
      </Box>
    ),
    error: () => (
      <Box padding={1}>
        <Text color="red">Error: {errorMessage}</Text>
      </Box>
    ),
    ready: () =>
      isConfigured ? <MainApp /> : <ApiKeyPrompt onSubmit={setApiKey} />,
  } satisfies Record<ConfigState["status"], () => JSX.Element>;

  return renderByStatus[configState.status]();
}

export default function App() {
  return (
    <ClientProvider>
      <AppProvider>
        <AppWithClient />
      </AppProvider>
    </ClientProvider>
  );
}
