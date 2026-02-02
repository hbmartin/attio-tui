import { Box, Text } from "ink";
import type { PaneId } from "../../types/navigation.js";
import type {
  StatusMessage,
  StatusMessageTone,
} from "../../types/status-message.js";

interface StatusBarProps {
  readonly focusedPane: PaneId;
  readonly itemCount?: number;
  readonly selectedIndex?: number;
  readonly loading?: boolean;
  readonly statusMessage?: StatusMessage;
  readonly debugEnabled?: boolean;
}

function getStatusMessageColor(statusMessage: StatusMessage): "red" | "green" {
  const colorsByTone: Record<StatusMessageTone, "red" | "green"> = {
    error: "red",
    info: "green",
  };

  return colorsByTone[statusMessage.tone];
}

interface ContextualHint {
  readonly key: string;
  readonly action: string;
}

/**
 * Get contextual hints based on the currently focused pane.
 * This helps users discover available actions in their current context.
 */
function getContextualHints(focusedPane: PaneId): readonly ContextualHint[] {
  const commonHints: ContextualHint[] = [
    { key: "Tab", action: "switch panes" },
    { key: ":", action: "commands" },
  ];

  const paneSpecificHints: Record<PaneId, readonly ContextualHint[]> = {
    navigator: [
      { key: "j/k", action: "navigate" },
      { key: "Enter", action: "select" },
      { key: "l", action: "go to results" },
    ],
    results: [
      { key: "j/k", action: "navigate" },
      { key: "y", action: "copy ID" },
      { key: "Ctrl+O", action: "open" },
      { key: "G/g", action: "jump" },
    ],
    detail: [
      { key: "h/l", action: "tabs" },
      { key: "j/k", action: "scroll" },
    ],
  };

  return [...commonHints, ...paneSpecificHints[focusedPane]];
}

/**
 * Status bar component showing contextual keyboard shortcuts
 * and status information.
 */
export function StatusBar({
  focusedPane,
  itemCount,
  selectedIndex,
  loading,
  statusMessage,
  debugEnabled,
}: StatusBarProps) {
  // Get contextual hints based on focused pane
  const hints = getContextualHints(focusedPane);

  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box gap={2}>
        {hints.map((hint) => (
          <Text key={hint.key} dimColor={true}>
            <Text bold={true}>{hint.key}</Text> {hint.action}
          </Text>
        ))}
        <Text dimColor={true}>
          <Text bold={true}>?</Text> help
        </Text>
        <Text dimColor={true}>
          <Text bold={true}>q</Text> quit
        </Text>
      </Box>
      <Box gap={2}>
        {statusMessage && (
          <Text color={getStatusMessageColor(statusMessage)}>
            {statusMessage.text}
          </Text>
        )}
        {loading && <Text color="yellow">Loading...</Text>}
        {itemCount !== undefined && selectedIndex !== undefined && (
          <Text dimColor={true}>
            {selectedIndex + 1}/{itemCount}
          </Text>
        )}
        {debugEnabled && <Text color="yellow">[DEBUG]</Text>}
        <Text color="blue">[{focusedPane}]</Text>
      </Box>
    </Box>
  );
}
