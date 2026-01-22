import { Box, Text } from "ink";
import type { Command } from "../../types/commands.js";

interface CommandListProps {
  readonly commands: readonly Command[];
  readonly selectedIndex: number;
}

export function CommandList({ commands, selectedIndex }: CommandListProps) {
  if (commands.length === 0) {
    return <Text dimColor={true}>No matching commands</Text>;
  }

  return (
    <Box flexDirection="column">
      {commands.slice(0, 10).map((command, index) => {
        const isSelected = index === selectedIndex;
        const backgroundColor = isSelected ? "blue" : undefined;
        const textColor = isSelected ? "white" : undefined;

        return (
          <Box key={command.id} gap={2}>
            <Text backgroundColor={backgroundColor} color={textColor}>
              {isSelected ? ">" : " "} {command.label}
            </Text>
            <Text dimColor={!isSelected}>{command.description}</Text>
            {command.shortcut && (
              <Text color="gray" dimColor={true}>
                ({command.shortcut})
              </Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
