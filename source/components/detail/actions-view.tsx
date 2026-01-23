import { Box, Text } from "ink";
import type { ResultItem } from "../../types/navigation.js";

interface ActionsViewProps {
  readonly item: ResultItem | undefined;
}

interface ActionItem {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

const ACTIONS: readonly ActionItem[] = [
  {
    key: "y",
    label: "Copy ID (yank)",
    description: "Copy record ID to clipboard",
  },
  { key: "Ctrl+O", label: "Open", description: "Open in browser" },
  { key: "Ctrl+R", label: "Refresh", description: "Refresh current data" },
  { key: "Ctrl+D", label: "Debug", description: "Toggle debug panel" },
  {
    key: ":copy id",
    label: "Copy ID",
    description: "Copy selected item ID to clipboard",
  },
  { key: ":open", label: "Open", description: "Open selected item" },
  {
    key: ":export json",
    label: "Export JSON",
    description: "Export selected item as JSON",
  },
  {
    key: ":toggle debug",
    label: "Debug",
    description: "Toggle debug panel",
  },
  {
    key: ":columns",
    label: "Columns",
    description: "Configure result columns",
  },
  { key: ":", label: "Command", description: "Open command palette" },
];

export function ActionsView({ item }: ActionsViewProps) {
  if (!item) {
    return <Text dimColor={true}>Select an item to see available actions</Text>;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold={true}>Available Actions:</Text>
      {ACTIONS.map((action) => (
        <Box key={action.key} gap={1}>
          <Text color="blue" bold={true}>
            {action.key}
          </Text>
          <Text>{action.label}</Text>
          <Text dimColor={true}>- {action.description}</Text>
        </Box>
      ))}
    </Box>
  );
}
