import { useStdout } from "ink";
import { useEffect, useState } from "react";

/**
 * Terminal dimensions including width and height in characters.
 */
export interface TerminalDimensions {
  /** Terminal width in columns (characters) */
  readonly width: number;
  /** Terminal height in rows (lines) */
  readonly height: number;
}

/** Default dimensions when terminal size cannot be determined */
const DEFAULT_DIMENSIONS: TerminalDimensions = {
  width: 80,
  height: 24,
};

/** Breakpoints for responsive layout decisions */
export const TerminalBreakpoints = {
  /** Threshold below which terminal is considered narrow (< 60 columns = compact) */
  NARROW: 60,
  /** Threshold at or above which terminal is considered wide (>= 120 columns = wide) */
  WIDE: 120,
} as const;

/**
 * Layout mode based on terminal width.
 * Components can use this to decide how to arrange content.
 */
export type LayoutMode = "compact" | "normal" | "wide";

/**
 * Determine layout mode based on terminal width.
 */
export function getLayoutMode(width: number): LayoutMode {
  if (width < TerminalBreakpoints.NARROW) {
    return "compact";
  }
  if (width >= TerminalBreakpoints.WIDE) {
    return "wide";
  }
  return "normal";
}

/**
 * Hook to get and track terminal dimensions.
 *
 * Updates automatically when the terminal is resized.
 *
 * Usage:
 * ```tsx
 * const { width, height } = useTerminalDimensions();
 * const layoutMode = getLayoutMode(width);
 *
 * return (
 *   <Box flexDirection={layoutMode === "compact" ? "column" : "row"}>
 *     ...
 *   </Box>
 * );
 * ```
 */
export function useTerminalDimensions(): TerminalDimensions {
  const { stdout } = useStdout();

  const [dimensions, setDimensions] = useState<TerminalDimensions>(() => ({
    width: stdout.columns ?? DEFAULT_DIMENSIONS.width,
    height: stdout.rows ?? DEFAULT_DIMENSIONS.height,
  }));

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: stdout.columns ?? DEFAULT_DIMENSIONS.width,
        height: stdout.rows ?? DEFAULT_DIMENSIONS.height,
      });
    };

    // Listen for resize events
    stdout.on("resize", handleResize);

    // Get initial dimensions
    handleResize();

    return () => {
      stdout.off("resize", handleResize);
    };
  }, [stdout]);

  return dimensions;
}

/**
 * Hook that returns both dimensions and derived layout mode.
 *
 * Convenience hook that combines useTerminalDimensions with getLayoutMode.
 */
export function useResponsiveLayout(): TerminalDimensions & {
  readonly layoutMode: LayoutMode;
} {
  const dimensions = useTerminalDimensions();
  const layoutMode = getLayoutMode(dimensions.width);

  return { ...dimensions, layoutMode };
}

/**
 * Calculate optimal column widths for a three-pane layout.
 *
 * Returns recommended widths for navigator, results, and detail panes
 * based on terminal width.
 */
export function calculatePaneWidths(terminalWidth: number): {
  readonly navigatorWidth: number;
  readonly resultsMinWidth: number;
  readonly detailWidth: string;
} {
  const layoutMode = getLayoutMode(terminalWidth);

  switch (layoutMode) {
    case "compact":
      return {
        navigatorWidth: 15,
        resultsMinWidth: 20,
        detailWidth: "30%",
      };
    case "wide":
      return {
        navigatorWidth: 25,
        resultsMinWidth: 40,
        detailWidth: "40%",
      };
    default:
      return {
        navigatorWidth: 20,
        resultsMinWidth: 30,
        detailWidth: "35%",
      };
  }
}

/**
 * Calculate how many items can be displayed in a list given terminal height.
 *
 * Accounts for header, footer, and padding.
 */
export function calculateVisibleItems(params: {
  readonly terminalHeight: number;
  readonly headerLines?: number;
  readonly footerLines?: number;
  readonly paddingLines?: number;
}): number {
  const {
    terminalHeight,
    headerLines = 2,
    footerLines = 1,
    paddingLines = 2,
  } = params;

  const reservedLines = headerLines + footerLines + paddingLines;
  return Math.max(1, terminalHeight - reservedLines);
}
