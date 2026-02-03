import { Box, Text } from "ink";
import { useMemo } from "react";
import type { ResultItem } from "../../types/navigation.js";

const MAX_LINES = 20;

interface JsonViewProps {
  readonly item: ResultItem | undefined;
}

export function JsonView({ item }: JsonViewProps) {
  // Memoize JSON serialization to avoid blocking the UI on every render
  const { lines, hasMore } = useMemo(() => {
    if (!item) {
      return { lines: [], hasMore: false };
    }
    const jsonString = JSON.stringify(item.data, null, 2);
    const allLines = jsonString.split("\n");
    return {
      lines: allLines.slice(0, MAX_LINES),
      hasMore: allLines.length > MAX_LINES,
    };
  }, [item]);

  if (!item) {
    return <Text dimColor={true}>Select an item to view JSON</Text>;
  }

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
