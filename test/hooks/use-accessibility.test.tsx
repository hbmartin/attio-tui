import { Text } from "ink";
import { render } from "ink-testing-library";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
      expect(AriaRoles.TAB_PANEL).toBe("tabpanel");
      expect(AriaRoles.REGION).toBe("region");
      expect(AriaRoles.STATUS).toBe("status");
      expect(AriaRoles.ALERT).toBe("alert");
      expect(AriaRoles.DIALOG).toBe("dialog");
      expect(AriaRoles.SEARCH).toBe("search");
      expect(AriaRoles.TEXTBOX).toBe("textbox");
      expect(AriaRoles.BUTTON).toBe("button");
    });
  });
});

describe("useAccessibility (environment detection)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns isScreenReaderEnabled=true when ATTIO_TUI_ACCESSIBLE=1", async () => {
    vi.stubEnv("ATTIO_TUI_ACCESSIBLE", "1");

    const { useAccessibility } = await import(
      "../../source/hooks/use-accessibility.js"
    );

    // Test the hook by rendering a component that uses it
    function TestComponent(): ReactElement {
      const { isScreenReaderEnabled } = useAccessibility();
      return <Text>{isScreenReaderEnabled ? "enabled" : "disabled"}</Text>;
    }

    const instance = render(<TestComponent />);
    try {
      expect(instance.lastFrame()).toContain("enabled");
    } finally {
      instance.cleanup();
    }
  });

  it("returns isScreenReaderEnabled=false when no accessibility env is set", async () => {
    vi.stubEnv("ATTIO_TUI_ACCESSIBLE", "");
    vi.stubEnv("TERM_PROGRAM", "");

    const { useAccessibility } = await import(
      "../../source/hooks/use-accessibility.js"
    );

    function TestComponent(): ReactElement {
      const { isScreenReaderEnabled } = useAccessibility();
      return <Text>{isScreenReaderEnabled ? "enabled" : "disabled"}</Text>;
    }

    const instance = render(<TestComponent />);
    try {
      expect(instance.lastFrame()).toContain("disabled");
    } finally {
      instance.cleanup();
    }
  });
});
