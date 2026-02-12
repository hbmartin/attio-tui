import { Box } from "ink";
import type { DetailTab, ResultItem } from "../../types/navigation.js";
import { Pane } from "../layout/pane.js";
import { ActionsView } from "./actions-view.js";
import { DetailTabs } from "./detail-tabs.js";
import { JsonView } from "./json-view.js";
import { SdkView } from "./sdk-view.js";
import { SummaryView } from "./summary-view.js";

interface DetailPaneProps {
  readonly item: ResultItem | undefined;
  readonly activeTab: DetailTab;
  readonly focused: boolean;
}

export function DetailPane({ item, activeTab, focused }: DetailPaneProps) {
  const renderTabContent = () => {
    switch (activeTab) {
      case "summary":
        return <SummaryView item={item} />;
      case "json":
        return <JsonView item={item} />;
      case "sdk":
        return <SdkView item={item} />;
      case "actions":
        return <ActionsView item={item} />;
    }
  };

  return (
    <Pane title="Detail" focused={focused}>
      <Box flexDirection="column" gap={1}>
        <DetailTabs activeTab={activeTab} focused={focused} />
        <Box flexDirection="column" marginTop={1}>
          {renderTabContent()}
        </Box>
      </Box>
    </Pane>
  );
}
