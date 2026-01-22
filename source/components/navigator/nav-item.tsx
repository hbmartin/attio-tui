import { Box, Text } from "ink";
import type { NavigatorCategory } from "../../types/navigation.js";

interface NavItemProps {
  readonly category: NavigatorCategory;
  readonly selected: boolean;
  readonly focused: boolean;
}

function getCategoryLabel(category: NavigatorCategory): string {
  switch (category.type) {
    case "object":
      return category.objectSlug as string;
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

export function NavItem({ category, selected, focused }: NavItemProps) {
  const backgroundColor = selected && focused ? "blue" : undefined;
  const textColor = getTextColor(selected, focused);

  return (
    <Box>
      <Text backgroundColor={backgroundColor} color={textColor}>
        {selected ? ">" : " "} {getCategoryIcon(category)}{" "}
        {getCategoryLabel(category)}
      </Text>
    </Box>
  );
}
