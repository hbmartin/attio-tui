import { Box, Text } from "ink";
import { useAccessibility } from "../../hooks/use-accessibility.js";
import type { NavigatorCategory } from "../../types/navigation.js";

interface NavItemProps {
  readonly category: NavigatorCategory;
  readonly selected: boolean;
  readonly focused: boolean;
}

function getCategoryLabel(category: NavigatorCategory): string {
  switch (category.type) {
    case "object":
      return category.objectSlug;
    case "list":
      return `List: ${category.listId}`;
    case "notes":
      return "Notes";
    case "tasks":
      return "Tasks";
    case "meetings":
      return "Meetings";
    case "webhooks":
      return "Webhooks";
  }
}

function getCategoryIcon(category: NavigatorCategory): string {
  switch (category.type) {
    case "object":
      return ">";
    case "list":
      return "#";
    case "notes":
      return "N";
    case "tasks":
      return "T";
    case "meetings":
      return "M";
    case "webhooks":
      return "W";
  }
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

/**
 * Navigation item component with visual selection indicators.
 * In screen reader mode, shows clearer text labels instead of icons.
 */
export function NavItem({ category, selected, focused }: NavItemProps) {
  const { isScreenReaderEnabled } = useAccessibility();
  const backgroundColor = selected && focused ? "blue" : undefined;
  const textColor = getTextColor(selected, focused);
  const label = getCategoryLabel(category);

  // In screen reader mode, show clearer text without icons
  const displayText = isScreenReaderEnabled
    ? `${selected ? "[Selected] " : ""}${label}`
    : `${getCategoryIcon(category)} ${label}`;

  return (
    <Box>
      <Text backgroundColor={backgroundColor} color={textColor} wrap="truncate">
        {displayText}
      </Text>
    </Box>
  );
}
