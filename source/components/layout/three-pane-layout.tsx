import { Box } from "ink";
import type { ReactNode } from "react";

interface ThreePaneLayoutProps {
  readonly navigator: ReactNode;
  readonly results: ReactNode;
  readonly detail: ReactNode;
  readonly statusBar?: ReactNode;
}

export function ThreePaneLayout({
  navigator,
  results,
  detail,
  statusBar,
}: ThreePaneLayoutProps) {
  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Box flexDirection="row" flexGrow={1}>
        <Box width={20}>{navigator}</Box>
        <Box flexGrow={1} minWidth={30}>
          {results}
        </Box>
        <Box width="40%">{detail}</Box>
      </Box>
      {statusBar && <Box marginTop={1}>{statusBar}</Box>}
    </Box>
  );
}
