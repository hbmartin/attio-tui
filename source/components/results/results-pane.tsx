import { Box, Text } from "ink";
import type { Columns } from "../../types/columns.js";
import type { ResultItem } from "../../types/navigation.js";
import { Pane } from "../layout/pane.js";
import { ResultsHeader, ResultsRow } from "./results-row.js";

interface ResultsPaneProps {
  readonly items: readonly ResultItem[];
  readonly selectedIndex: number;
  readonly focused: boolean;
  readonly loading: boolean;
  readonly hasNextPage: boolean;
  readonly categoryLabel?: string;
  readonly error?: string;
  readonly columns?: readonly Columns.ResolvedColumn[];
}

interface ResultsContentProps {
  readonly items: readonly ResultItem[];
  readonly selectedIndex: number;
  readonly focused: boolean;
  readonly loading: boolean;
  readonly hasNextPage: boolean;
  readonly error?: string;
  readonly columns?: readonly Columns.ResolvedColumn[];
}

function ResultsContent({
  items,
  selectedIndex,
  focused,
  loading,
  hasNextPage,
  error,
  columns,
}: ResultsContentProps) {
  if (loading && items.length === 0) {
    return <Text color="yellow">Loading...</Text>;
  }

  if (error) {
    return <Text color="red">Error: {error}</Text>;
  }

  if (items.length === 0) {
    return <Text dimColor={true}>No results</Text>;
  }

  return (
    <Box flexDirection="column">
      {columns && columns.length > 0 && <ResultsHeader columns={columns} />}
      {items.map((item, index) => (
        <ResultsRow
          key={item.id}
          item={item}
          selected={index === selectedIndex}
          focused={focused}
          columns={columns}
        />
      ))}
      {loading && (
        <Box marginTop={1}>
          <Text color="yellow">Loading more...</Text>
        </Box>
      )}
      {!loading && hasNextPage && (
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
  error,
  columns,
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
        error={error}
        columns={columns}
      />
    </Pane>
  );
}
