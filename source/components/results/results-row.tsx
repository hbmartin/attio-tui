import { Box, Text } from "ink";
import type { Columns } from "../../types/columns.js";
import type { ResultItem } from "../../types/navigation.js";
import { truncate } from "../../utils/formatting.js";

interface ResultsRowProps {
  readonly item: ResultItem;
  readonly selected: boolean;
  readonly focused: boolean;
  readonly columns?: readonly Columns.ResolvedColumn[];
}

function getTextColor(selected: boolean, focused: boolean): string | undefined {
  if (selected && focused) {
    return "white";
  }
  if (selected) {
    return "blue";
  }
  return;
}

function truncateToWidth(value: string, width: number): string {
  if (width <= 0) {
    return "";
  }
  if (value.length <= width) {
    return value;
  }
  if (width <= 3) {
    return value.slice(0, width);
  }
  return truncate(value, width);
}

function formatColumnRow(
  columns: readonly Columns.ResolvedColumn[],
  valueForColumn: (column: Columns.ResolvedColumn) => string,
): string {
  return columns
    .map((column) => {
      const width = Math.max(column.width, 1);
      const value = truncateToWidth(valueForColumn(column), width);
      return value.padEnd(width);
    })
    .join("  ");
}

export function ResultsHeader({
  columns,
}: {
  readonly columns: readonly Columns.ResolvedColumn[];
}) {
  if (columns.length === 0) {
    return null;
  }

  const header = formatColumnRow(columns, (column) => column.label);

  return (
    <Box>
      <Text dimColor={true}>{`  ${header}`}</Text>
    </Box>
  );
}

export function ResultsRow({
  item,
  selected,
  focused,
  columns,
}: ResultsRowProps) {
  const backgroundColor = selected && focused ? "blue" : undefined;
  const textColor = getTextColor(selected, focused);
  const prefix = selected ? "> " : "  ";

  if (columns && columns.length > 0) {
    const row = formatColumnRow(columns, (column) => column.value(item));
    return (
      <Box>
        <Text backgroundColor={backgroundColor} color={textColor}>
          {prefix}
          {row}
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text backgroundColor={backgroundColor} color={textColor}>
        {prefix}
        {item.title}
        {item.subtitle && (
          <Text dimColor={!(selected && focused)}> - {item.subtitle}</Text>
        )}
      </Text>
    </Box>
  );
}
