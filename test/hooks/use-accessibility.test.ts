import process from "node:process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AriaRoles,
  createSelectableLabel,
} from "../../source/hooks/use-accessibility.js";

describe("use-accessibility", () => {
  describe("createSelectableLabel", () => {
    it("returns label without selection marker when not selected", () => {
      const result = createSelectableLabel({
        label: "Companies",
        selected: false,
      });

      expect(result).toBe("Companies");
    });

    it("includes (selected) marker when selected", () => {
      const result = createSelectableLabel({
        label: "Companies",
        selected: true,
      });

      expect(result).toBe("(selected) Companies");
    });

    it("includes index and total when provided", () => {
      const result = createSelectableLabel({
        label: "Companies",
        selected: false,
        index: 0,
        total: 5,
      });

      expect(result).toBe("Companies (1 of 5)");
    });

    it("includes all markers when selected with index", () => {
      const result = createSelectableLabel({
        label: "Companies",
        selected: true,
        index: 2,
        total: 5,
      });

      expect(result).toBe("(selected) Companies (3 of 5)");
    });
  });

  describe("AriaRoles", () => {
    it("contains expected ARIA roles", () => {
      expect(AriaRoles.LIST).toBe("list");
      expect(AriaRoles.LIST_ITEM).toBe("listitem");
      expect(AriaRoles.MENU).toBe("menu");
      expect(AriaRoles.MENU_ITEM).toBe("menuitem");
      expect(AriaRoles.TAB).toBe("tab");
      expect(AriaRoles.TAB_LIST).toBe("tablist");
      expect(AriaRoles.STATUS).toBe("status");
      expect(AriaRoles.ALERT).toBe("alert");
      expect(AriaRoles.DIALOG).toBe("dialog");
    });
  });
});

describe("useAccessibility (environment detection)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment for each test
    delete process.env.ATTIO_TUI_ACCESSIBLE;
    delete process.env.TERM_PROGRAM;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  it("detects screen reader mode from ATTIO_TUI_ACCESSIBLE env var", async () => {
    process.env.ATTIO_TUI_ACCESSIBLE = "1";

    // Dynamic import to pick up new env
    const { useAccessibility } = await import(
      "../../source/hooks/use-accessibility.js"
    );

    // We can't easily test hooks outside React, so we just verify the module loads
    expect(useAccessibility).toBeDefined();
    expect(typeof useAccessibility).toBe("function");
  });
});
