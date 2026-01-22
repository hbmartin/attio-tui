import { Box, Text } from "ink";
import type { ResultItem } from "../../types/navigation.js";

interface ResultsRowProps {
  readonly item: ResultItem;
  readonly selected: boolean;
  readonly focused: boolean;
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

export function ResultsRow({ item, selected, focused }: ResultsRowProps) {
  const backgroundColor = selected && focused ? "blue" : undefined;
  const textColor = getTextColor(selected, focused);

  return (
    <Box>
      <Text backgroundColor={backgroundColor} color={textColor}>
        {selected ? ">" : " "} {item.title}
        {item.subtitle && (
          <Text dimColor={!(selected && focused)}> - {item.subtitle}</Text>
        )}
      </Text>
    </Box>
  );
}
