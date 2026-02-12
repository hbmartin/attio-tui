import type { Command } from "../types/commands.js";

export const DEFAULT_COMMANDS: readonly Command[] = [
  // Navigation commands
  {
    id: "goto-companies",
    label: "Go to Companies",
    description: "Navigate to companies list",
    action: { type: "navigation", target: "companies" },
  },
  {
    id: "goto-people",
    label: "Go to People",
    description: "Navigate to people list",
    action: { type: "navigation", target: "people" },
  },
  {
    id: "goto-objects",
    label: "Go to Objects",
    description: "Browse all workspace objects",
    action: { type: "navigation", target: "objects" },
  },
  {
    id: "goto-lists",
    label: "Go to Lists",
    description: "Navigate to workspace lists",
    action: { type: "navigation", target: "lists" },
  },
  {
    id: "goto-notes",
    label: "Go to Notes",
    description: "Navigate to notes",
    action: { type: "navigation", target: "notes" },
  },
  {
    id: "goto-tasks",
    label: "Go to Tasks",
    description: "Navigate to tasks",
    action: { type: "navigation", target: "tasks" },
  },
  {
    id: "goto-meetings",
    label: "Go to Meetings",
    description: "Navigate to meetings",
    action: { type: "navigation", target: "meetings" },
  },
  {
    id: "goto-webhooks",
    label: "Go to Webhooks",
    description: "Navigate to webhook management",
    action: { type: "navigation", target: "webhooks" },
  },

  // Action commands
  {
    id: "copy-id",
    label: "Copy ID",
    description: "Copy selected item ID to clipboard",
    shortcut: "y",
    action: { type: "action", actionId: "copyId" },
  },
  {
    id: "open-browser",
    label: "Open in Browser",
    description: "Open selected item in Attio web app",
    shortcut: "Ctrl+O",
    action: { type: "action", actionId: "openInBrowser" },
  },
  {
    id: "refresh",
    label: "Refresh",
    description: "Refresh current data",
    shortcut: "Ctrl+R",
    action: { type: "action", actionId: "refresh" },
  },
  {
    id: "export-json",
    label: "Export JSON",
    description: "Export selected item as JSON file",
    action: { type: "action", actionId: "exportJson" },
  },
  {
    id: "help",
    label: "Help",
    description: "Show keyboard shortcuts and help",
    action: { type: "action", actionId: "help" },
  },
  {
    id: "columns",
    label: "Columns",
    description: "Configure columns for the current results",
    action: { type: "action", actionId: "columns" },
  },
  {
    id: "quit",
    label: "Quit",
    description: "Exit the application",
    shortcut: "q",
    action: { type: "action", actionId: "quit" },
  },

  // Toggle commands
  {
    id: "toggle-debug",
    label: "Toggle Debug Panel",
    description: "Show/hide debug information",
    shortcut: "Ctrl+D",
    action: { type: "toggle", toggleId: "debug" },
  },

  // Webhook commands
  {
    id: "webhook-create",
    label: "Webhook Create",
    description: "Create a new webhook",
    action: { type: "webhook", webhookAction: "create" },
  },
  {
    id: "webhook-edit",
    label: "Webhook Edit",
    description: "Edit selected webhook",
    action: { type: "webhook", webhookAction: "edit" },
  },
  {
    id: "webhook-delete",
    label: "Webhook Delete",
    description: "Delete selected webhook",
    action: { type: "webhook", webhookAction: "delete" },
  },
];

// Filter commands based on search query
export function filterCommands(
  commands: readonly Command[],
  query: string,
): readonly Command[] {
  if (!query.trim()) {
    return commands;
  }

  const lowerQuery = query.toLowerCase();
  return commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(lowerQuery) ||
      cmd.description.toLowerCase().includes(lowerQuery),
  );
}
