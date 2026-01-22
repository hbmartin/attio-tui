import { Box, Text } from "ink";
import type { Command } from "../../types/commands.js";
import { CommandInput } from "./command-input.js";
import { CommandList } from "./command-list.js";

interface CommandPaletteProps {
  readonly isOpen: boolean;
  readonly query: string;
  readonly commands: readonly Command[];
  readonly selectedIndex: number;
}

export function CommandPalette({
  isOpen,
  query,
  commands,
  selectedIndex,
}: CommandPaletteProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="blue"
      paddingX={2}
      paddingY={1}
      marginTop={1}
    >
      <Box marginBottom={1}>
        <Text bold={true} color="blue">
          Command Palette
        </Text>
        <Text dimColor={true}> (Esc to close)</Text>
      </Box>
      <CommandInput value={query} />
      <Box marginTop={1}>
        <CommandList commands={commands} selectedIndex={selectedIndex} />
      </Box>
    </Box>
  );
}
