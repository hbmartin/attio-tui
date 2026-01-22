import { Box, Text } from "ink";
import type { ResultItem } from "../../types/navigation.js";
import { Pane } from "../layout/pane.js";
import { ResultsRow } from "./results-row.js";

interface ResultsPaneProps {
  readonly items: readonly ResultItem[];
  readonly selectedIndex: number;
  readonly focused: boolean;
  readonly loading: boolean;
  readonly hasNextPage: boolean;
  readonly categoryLabel?: string;
}

interface ResultsContentProps {
  readonly items: readonly ResultItem[];
  readonly selectedIndex: number;
  readonly focused: boolean;
  readonly loading: boolean;
  readonly hasNextPage: boolean;
}

function ResultsContent({
  items,
  selectedIndex,
  focused,
  loading,
  hasNextPage,
}: ResultsContentProps) {
  if (loading) {
    return <Text color="yellow">Loading...</Text>;
  }

  if (items.length === 0) {
    return <Text dimColor={true}>No results</Text>;
  }

  return (
    <Box flexDirection="column">
      {items.map((item, index) => (
        <ResultsRow
          key={item.id}
          item={item}
          selected={index === selectedIndex}
          focused={focused}
        />
      ))}
      {hasNextPage && (
        <Box marginTop={1}>
          <Text dimColor={true} italic={true}>
            Scroll for more...
          </Text>
        </Box>
      )}
    </Box>
  );
}

export function ResultsPane({
  items,
  selectedIndex,
  focused,
  loading,
  hasNextPage,
  categoryLabel,
}: ResultsPaneProps) {
  const title = categoryLabel ? `Results: ${categoryLabel}` : "Results";

  return (
    <Pane title={title} focused={focused}>
      <ResultsContent
        items={items}
        selectedIndex={selectedIndex}
        focused={focused}
        loading={loading}
        hasNextPage={hasNextPage}
      />
    </Pane>
  );
}
