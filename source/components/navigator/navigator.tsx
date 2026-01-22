import { Box, Text } from "ink";
import type { NavigatorCategory } from "../../types/navigation.js";
import { Pane } from "../layout/pane.js";
import { NavItem } from "./nav-item.js";

interface NavigatorProps {
  readonly categories: readonly NavigatorCategory[];
  readonly selectedIndex: number;
  readonly focused: boolean;
  readonly loading: boolean;
}

function NavigatorContent({
  loading,
  categories,
  selectedIndex,
  focused,
}: NavigatorProps) {
  if (loading) {
    return <Text color="yellow">Loading...</Text>;
  }

  if (categories.length === 0) {
    return <Text dimColor={true}>No items</Text>;
  }

  return (
    <Box flexDirection="column">
      {categories.map((category, index) => (
        <NavItem
          key={`${category.type}-${index}`}
          category={category}
          selected={index === selectedIndex}
          focused={focused}
        />
      ))}
    </Box>
  );
}

export function Navigator({
  categories,
  selectedIndex,
  focused,
  loading,
}: NavigatorProps) {
  return (
    <Pane title="Navigator" focused={focused}>
      <NavigatorContent
        loading={loading}
        categories={categories}
        selectedIndex={selectedIndex}
        focused={focused}
      />
    </Pane>
  );
}
