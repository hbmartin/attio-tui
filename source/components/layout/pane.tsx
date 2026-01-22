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

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text bold={true} color={titleColor}>
          {title}
        </Text>
        {focused && (
          <Text color="blue" dimColor={true}>
            {" "}
            (active)
          </Text>
        )}
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {children}
      </Box>
    </Box>
  );
}
