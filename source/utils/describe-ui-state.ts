import type { AppState } from "../state/app-state.js";
import type { NavigatorCategory } from "../types/navigation.js";

function getCategoryLabel(category: NavigatorCategory): string {
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

function describeWebhookModal(
  modal: AppState["navigation"]["webhookModal"],
): string {
  switch (modal.mode) {
    case "closed":
      return "closed";
    case "create":
      return `create (step=${modal.step}, url="${modal.targetUrl}", events=${String(modal.selectedEvents.length)})`;
    case "edit":
      return `edit (id=${modal.webhookId}, step=${modal.step}, url="${modal.targetUrl}", events=${String(modal.selectedEvents.length)})`;
    case "delete":
      return `delete (id=${modal.webhookId}, url="${modal.webhookUrl}")`;
  }
}

function describeColumnPicker(
  picker: AppState["navigation"]["columnPicker"],
): string {
  switch (picker.mode) {
    case "closed":
      return "closed";
    case "open":
      return `open (entity=${picker.entityKey}, title="${picker.title}")`;
  }
}

export function describeUiState(state: AppState): string {
  const { navigation, debugEnabled } = state;
  const {
    focusedPane,
    navigator,
    results,
    detail,
    commandPalette,
    webhookModal,
    columnPicker,
  } = navigation;

  const selectedCategory = navigator.categories[navigator.selectedIndex];
  const selectedCategoryLabel = selectedCategory
    ? getCategoryLabel(selectedCategory)
    : "none";

  const selectedResultItem = results.items[results.selectedIndex];
  const selectedResultTitle = selectedResultItem?.title ?? "none";

  const detailItemTitle = detail.item?.title ?? "none";
  const detailItemType = detail.item?.type ?? "none";

  const lines: string[] = [
    "=== UI State ===",
    `Navigator: focused=${String(focusedPane === "navigator")}, ${String(navigator.categories.length)} categories, selected="${selectedCategoryLabel}" (index ${String(navigator.selectedIndex)}), loading=${String(navigator.loading)}`,
    `Results: ${String(results.items.length)} items, selected="${selectedResultTitle}" (index ${String(results.selectedIndex)}), loading=${String(results.loading)}, hasNextPage=${String(results.hasNextPage)}, searchQuery="${results.searchQuery}"`,
    `Detail: tab=${detail.activeTab}, item="${detailItemTitle}" (type=${detailItemType}), focused=${String(focusedPane === "detail")}`,
    `Command Palette: ${commandPalette.isOpen ? `open (query="${commandPalette.query}", selectedIndex=${String(commandPalette.selectedIndex)})` : "closed"}`,
    `Column Picker: ${describeColumnPicker(columnPicker)}`,
    `Webhook Modal: ${describeWebhookModal(webhookModal)}`,
    `Debug: enabled=${String(debugEnabled)}`,
  ];

  return lines.join("\n");
}
