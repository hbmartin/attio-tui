import { Box, Text, useInput } from "ink";
import { useEffect, useRef } from "react";
import type { Command } from "../../types/commands.js";
import { CommandInput } from "./command-input.js";
import { CommandList } from "./command-list.js";

interface CommandPaletteProps {
  readonly isOpen: boolean;
  readonly query: string;
  readonly commands: readonly Command[];
  readonly selectedIndex: number;
  readonly onExecute?: (command: Command) => void;
  readonly onQueryChange?: (query: string) => void;
}

export function CommandPalette({
  isOpen,
  query,
  commands,
  selectedIndex,
  onExecute,
  onQueryChange,
}: CommandPaletteProps) {
  // Track latest query to avoid dropped keystrokes when input events outpace re-renders.
  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

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

  useInput(
    (input, key) => {
      if (!onQueryChange) {
        return;
      }
      if (key.escape || key.return) {
        return;
      }
      if (key.backspace) {
        const nextQuery = queryRef.current.slice(0, -1);
        queryRef.current = nextQuery;
        onQueryChange(nextQuery);
        return;
      }
      if (key.ctrl || key.meta) {
        return;
      }
      if (input) {
        const nextQuery = `${queryRef.current}${input}`;
        queryRef.current = nextQuery;
        onQueryChange(nextQuery);
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
