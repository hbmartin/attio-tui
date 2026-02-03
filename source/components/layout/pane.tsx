import { Box, Text } from "ink";
import type { ReactNode } from "react";

interface PaneProps {
  readonly title: string;
  readonly focused: boolean;
  readonly width?: number | string;
  readonly children: ReactNode;
}

/**
 * A pane component with clear focus indicators.
 *
 * Focus indicators include:
 * - Bright colored border when focused (blue), dim border when not (gray)
 * - Bold double-border style when focused, single-border when not
 * - Focus indicator symbol in title: [●] focused, [○] unfocused
 * - Background highlight on title when focused
 */
export function Pane({ title, focused, width, children }: PaneProps) {
  // Use more distinct border styles for focus
  const borderStyle = focused ? "double" : "round";
  const borderColor = focused ? "blue" : "gray";
  const titleColor = focused ? "blue" : "gray";

  // More visible focus indicator symbols
  const focusIndicator = focused ? "●" : "○";
  const headerLabel = `${title} [${focusIndicator}]`;

  // Title background highlight when focused
  const titleBackground = focused ? "blue" : undefined;
  const titleTextColor = focused ? "white" : titleColor;

  return (
    <Box
      flexDirection="column"
      width={width}
      height="100%"
      borderStyle={borderStyle}
      borderColor={borderColor}
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text
          bold={true}
          color={titleTextColor}
          backgroundColor={titleBackground}
          wrap="truncate"
        >
          {` ${headerLabel} `}
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {children}
      </Box>
    </Box>
  );
}
