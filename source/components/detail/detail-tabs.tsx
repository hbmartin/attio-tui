import { Box, Text } from "ink";
import { DETAIL_TABS, type DetailTab } from "../../types/navigation.js";

interface DetailTabsProps {
  readonly activeTab: DetailTab;
  readonly focused: boolean;
}

function getTabLabel(tab: DetailTab): string {
  switch (tab) {
    case "summary":
      return "Summary";
    case "json":
      return "JSON";
    case "sdk":
      return "SDK";
    case "actions":
      return "Actions";
  }
}

function getTabTextColor(isActive: boolean, focused: boolean): string {
  if (isActive && focused) {
    return "white";
  }
  if (isActive) {
    return "blue";
  }
  return "gray";
}

/**
 * Tab navigation component for the detail pane.
 * Shows tabs with visual indicators for active state and focus.
 */
export function DetailTabs({ activeTab, focused }: DetailTabsProps) {
  return (
    <Box gap={1}>
      {DETAIL_TABS.map((tab) => {
        const isActive = tab === activeTab;
        const backgroundColor = isActive && focused ? "blue" : undefined;
        const textColor = getTabTextColor(isActive, focused);
        const label = getTabLabel(tab);

        return (
          <Box key={tab}>
            <Text
              backgroundColor={backgroundColor}
              color={textColor}
              bold={isActive}
            >
              [{label}]
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
