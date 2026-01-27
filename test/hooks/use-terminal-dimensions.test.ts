import { describe, expect, it } from "vitest";
import {
  calculatePaneWidths,
  calculateVisibleItems,
  getLayoutMode,
  TerminalBreakpoints,
} from "../../source/hooks/use-terminal-dimensions.js";

describe("use-terminal-dimensions", () => {
  describe("getLayoutMode", () => {
    it("returns compact for narrow terminals", () => {
      expect(getLayoutMode(40)).toBe("compact");
      expect(getLayoutMode(59)).toBe("compact");
    });

    it("returns normal for medium terminals", () => {
      expect(getLayoutMode(60)).toBe("normal");
      expect(getLayoutMode(100)).toBe("normal");
      expect(getLayoutMode(119)).toBe("normal");
    });

    it("returns wide for wide terminals", () => {
      expect(getLayoutMode(120)).toBe("wide");
      expect(getLayoutMode(200)).toBe("wide");
    });
  });

  describe("TerminalBreakpoints", () => {
    it("has expected values", () => {
      expect(TerminalBreakpoints.NARROW).toBe(60);
      expect(TerminalBreakpoints.MEDIUM).toBe(100);
      expect(TerminalBreakpoints.WIDE).toBe(120);
    });
  });

  describe("calculatePaneWidths", () => {
    it("returns compact widths for narrow terminals", () => {
      const widths = calculatePaneWidths(50);

      expect(widths.navigatorWidth).toBe(15);
      expect(widths.resultsMinWidth).toBe(20);
      expect(widths.detailWidth).toBe("30%");
    });

    it("returns normal widths for medium terminals", () => {
      const widths = calculatePaneWidths(100);

      expect(widths.navigatorWidth).toBe(20);
      expect(widths.resultsMinWidth).toBe(30);
      expect(widths.detailWidth).toBe("35%");
    });

    it("returns wide widths for wide terminals", () => {
      const widths = calculatePaneWidths(150);

      expect(widths.navigatorWidth).toBe(25);
      expect(widths.resultsMinWidth).toBe(40);
      expect(widths.detailWidth).toBe("40%");
    });
  });

  describe("calculateVisibleItems", () => {
    it("calculates visible items with default parameters", () => {
      // 24 - 2 header - 1 footer - 2 padding = 19
      expect(calculateVisibleItems({ terminalHeight: 24 })).toBe(19);
    });

    it("calculates visible items with custom parameters", () => {
      expect(
        calculateVisibleItems({
          terminalHeight: 24,
          headerLines: 3,
          footerLines: 2,
          paddingLines: 4,
        }),
      ).toBe(15);
    });

    it("returns minimum of 1 for very small terminals", () => {
      expect(calculateVisibleItems({ terminalHeight: 5 })).toBe(1);
      expect(calculateVisibleItems({ terminalHeight: 1 })).toBe(1);
    });
  });
});
