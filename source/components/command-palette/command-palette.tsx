import { Box, Text, useInput } from "ink";
import type { Command } from "../../types/commands.js";
import { CommandInput } from "./command-input.js";
import { CommandList } from "./command-list.js";

interface CommandPaletteProps {
  readonly isOpen: boolean;
  readonly query: string;
  readonly commands: readonly Command[];
  readonly selectedIndex: number;
  readonly onExecute?: (command: Command) => void;
}

export function CommandPalette({
  isOpen,
  query,
  commands,
  selectedIndex,
  onExecute,
}: CommandPaletteProps) {
  useInput(
    (_input, key) => {
      if (key.return && onExecute) {
        const selectedCommand = commands[selectedIndex];
        if (selectedCommand) {
          onExecute(selectedCommand);
        }
      }
    },
    { isActive: isOpen },
  );

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
