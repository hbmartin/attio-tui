import { Box, Text } from "ink";
import type { ResultItem } from "../../types/navigation.js";

interface JsonViewProps {
  readonly item: ResultItem | undefined;
}

export function JsonView({ item }: JsonViewProps) {
  if (!item) {
    return <Text dimColor={true}>Select an item to view JSON</Text>;
  }

  const jsonString = JSON.stringify(item.data, null, 2);
  const lines = jsonString.split("\n").slice(0, 20);
  const hasMore = jsonString.split("\n").length > 20;

  return (
    <Box flexDirection="column">
      {lines.map((line, lineIndex) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: JSON lines have no stable ID
        <Text key={lineIndex} color="gray">
          {line}
        </Text>
      ))}
      {hasMore && (
        <Text dimColor={true} italic={true}>
          ... (truncated)
        </Text>
      )}
    </Box>
  );
}
