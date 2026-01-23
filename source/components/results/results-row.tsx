import { Box, Text } from "ink";
import stringWidth from "string-width";
import type { Columns } from "../../types/columns.js";
import type { ResultItem } from "../../types/navigation.js";

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

const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

function sliceToWidth(value: string, width: number): string {
  if (width <= 0) {
    return "";
  }

  let result = "";
  let currentWidth = 0;

  for (const { segment } of GRAPHEME_SEGMENTER.segment(value)) {
    const segmentWidth = stringWidth(segment);
    if (currentWidth + segmentWidth > width) {
      break;
    }

    result += segment;
    currentWidth += segmentWidth;
  }

  return result;
}

function truncateToWidth(value: string, width: number): string {
  if (width <= 0) {
    return "";
  }

  if (stringWidth(value) <= width) {
    return value;
  }
  if (width <= 3) {
    return sliceToWidth(value, width);
  }

  const truncated = sliceToWidth(value, width - 3);
  return `${truncated}...`;
}

function padToWidth(value: string, width: number): string {
  const padding = Math.max(width - stringWidth(value), 0);
  if (padding === 0) {
    return value;
  }
  return `${value}${" ".repeat(padding)}`;
}

function formatColumnRow(
  columns: readonly Columns.ResolvedColumn[],
  valueForColumn: (column: Columns.ResolvedColumn) => string,
): string {
  return columns
    .map((column) => {
      const width = Math.max(column.width, 1);
      const value = truncateToWidth(valueForColumn(column), width);
      return padToWidth(value, width);
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
