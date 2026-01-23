import { Box, Text } from "ink";
import type { ReactNode } from "react";

interface PaneProps {
  readonly title: string;
  readonly focused: boolean;
  readonly width?: number | string;
  readonly children: ReactNode;
}

export function Pane({ title, focused, width, children }: PaneProps) {
  const borderColor = focused ? "blue" : "gray";
  const titleColor = focused ? "blue" : "gray";
  const focusTag = focused ? "[*]" : "[ ]";
  const headerLabel = `${title} ${focusTag}`;

  return (
    <Box
      flexDirection="column"
      width={width}
      height="100%"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text bold={true} color={titleColor} wrap="truncate">
          {headerLabel}
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {children}
      </Box>
    </Box>
  );
}
