import { Box, Text } from "ink";
import type { PaneId } from "../../types/navigation.js";

interface StatusBarProps {
  readonly focusedPane: PaneId;
  readonly itemCount?: number;
  readonly selectedIndex?: number;
  readonly loading?: boolean;
}

export function StatusBar({
  focusedPane,
  itemCount,
  selectedIndex,
  loading,
}: StatusBarProps) {
  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box gap={2}>
        <Text dimColor={true}>
          <Text bold={true}>Tab</Text> switch panes
        </Text>
        <Text dimColor={true}>
          <Text bold={true}>j/k</Text> navigate
        </Text>
        <Text dimColor={true}>
          <Text bold={true}>:</Text> command
        </Text>
        <Text dimColor={true}>
          <Text bold={true}>q</Text> quit
        </Text>
      </Box>
      <Box gap={2}>
        {loading && <Text color="yellow">Loading...</Text>}
        {itemCount !== undefined && selectedIndex !== undefined && (
          <Text dimColor={true}>
            {selectedIndex + 1}/{itemCount}
          </Text>
        )}
        <Text color="blue">[{focusedPane}]</Text>
      </Box>
    </Box>
  );
}
