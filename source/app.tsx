import { Box, Text, useApp as useInkApp } from "ink";
import { useEffect } from "react";
import { CommandPalette } from "./components/command-palette/command-palette.js";
import { DetailPane } from "./components/detail/detail-pane.js";
import { StatusBar } from "./components/layout/status-bar.js";
import { ThreePaneLayout } from "./components/layout/three-pane-layout.js";
import { Navigator } from "./components/navigator/navigator.js";
import { ResultsPane } from "./components/results/results-pane.js";
import { ApiKeyPrompt } from "./components/setup/api-key-prompt.js";
import { DEFAULT_COMMANDS, filterCommands } from "./constants/commands.js";
import { useActionHandler } from "./hooks/use-action-handler.js";
import { useCategoryData } from "./hooks/use-category-data.js";
import { useKeyboard } from "./hooks/use-keyboard.js";
import { ClientProvider, useClient } from "./state/client-context.js";
import { AppProvider, useApp } from "./state/context.js";
import { parseObjectSlug } from "./types/ids.js";
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
      return category.objectSlug as string;
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
function getCategoryType(category: NavigatorCategory | undefined): string {
  return category?.type ?? "object";
}

// Get category slug for objects
function getCategorySlug(
  category: NavigatorCategory | undefined,
): string | undefined {
  if (category?.type === "object") {
    return category.objectSlug as string;
  }
  return;
}

function MainApp() {
  const { state, dispatch } = useApp();
  const { client } = useClient();
  const { exit } = useInkApp();

  const { navigation } = state;
  const { focusedPane, navigator, results, detail, commandPalette } =
    navigation;

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
  } = useCategoryData({
    client,
    categoryType,
    categorySlug,
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

  // Handle keyboard actions
  const handleAction = useActionHandler({
    focusedPane,
    dispatch,
    exit,
  });

  // Setup keyboard handling
  useKeyboard({
    focusedPane,
    commandPaletteOpen: commandPalette.isOpen,
    onAction: handleAction,
  });

  // Filter commands for command palette
  const filteredCommands = filterCommands(
    DEFAULT_COMMANDS,
    commandPalette.query,
  );

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
          />
        }
      />

      <CommandPalette
        isOpen={commandPalette.isOpen}
        query={commandPalette.query}
        commands={filteredCommands}
        selectedIndex={commandPalette.selectedIndex}
      />
    </Box>
  );
}

function AppWithClient() {
  const { configState, setApiKey } = useClient();

  switch (configState.status) {
    case "loading":
      return (
        <Box padding={1}>
          <Text color="yellow">Loading configuration...</Text>
        </Box>
      );
    case "error":
      return (
        <Box padding={1}>
          <Text color="red">Error: {configState.error}</Text>
        </Box>
      );
    case "ready":
      if (!configState.isConfigured) {
        return <ApiKeyPrompt onSubmit={setApiKey} />;
      }
      return <MainApp />;
  }
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
