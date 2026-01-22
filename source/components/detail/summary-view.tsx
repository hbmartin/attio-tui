import { Box, Text } from "ink";
import type { ResultItem } from "../../types/navigation.js";

interface SummaryViewProps {
  readonly item: ResultItem | undefined;
}

export function SummaryView({ item }: SummaryViewProps) {
  if (!item) {
    return <Text dimColor={true}>Select an item to view details</Text>;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text bold={true}>Title: </Text>
        <Text>{item.title}</Text>
      </Box>
      {item.subtitle && (
        <Box>
          <Text bold={true}>Subtitle: </Text>
          <Text>{item.subtitle}</Text>
        </Box>
      )}
      <Box>
        <Text bold={true}>ID: </Text>
        <Text dimColor={true}>{item.id}</Text>
      </Box>
    </Box>
  );
}
