import process from "node:process";
import { useMemo } from "react";

/**
 * Accessibility utilities for TUI components.
 *
 * Screen reader mode can be enabled via:
 * - ATTIO_TUI_ACCESSIBLE=1 environment variable
 * - TERM_PROGRAM=screen-reader (some screen readers set this)
 *
 * When enabled, components should:
 * - Avoid ASCII art or spinners that read poorly
 * - Provide full text descriptions instead of abbreviated labels
 * - Use ARIA roles and labels for semantic context
 */
export interface AccessibilityState {
  /** Whether screen reader mode is enabled */
  readonly isScreenReaderEnabled: boolean;
}

function detectScreenReaderMode(): boolean {
  // Check explicit environment variable
  if (process.env["ATTIO_TUI_ACCESSIBLE"] === "1") {
    return true;
  }

  // Check for accessibility-focused terminal programs
  const termProgram = process.env["TERM_PROGRAM"]?.toLowerCase() ?? "";
  if (
    termProgram.includes("screen-reader") ||
    termProgram.includes("orca") ||
    termProgram.includes("nvda") ||
    termProgram.includes("jaws")
  ) {
    return true;
  }

  return false;
}

/**
 * Hook to detect if screen reader mode is enabled.
 *
 * Usage:
 * ```tsx
 * const { isScreenReaderEnabled } = useAccessibility();
 *
 * return (
 *   <Text>
 *     {isScreenReaderEnabled ? "Loading, please wait..." : "⠋"}
 *   </Text>
 * );
 * ```
 */
export function useAccessibility(): AccessibilityState {
  const isScreenReaderEnabled = useMemo(() => detectScreenReaderMode(), []);

  return { isScreenReaderEnabled };
}

/**
 * ARIA roles for common TUI elements.
 * These can be used as aria-role attributes on Box components.
 */
export const AriaRoles = {
  /** A list of items that can be navigated */
  LIST: "list",
  /** An item within a list */
  LIST_ITEM: "listitem",
  /** A menubar or menu */
  MENU: "menu",
  /** An item within a menu */
  MENU_ITEM: "menuitem",
  /** A tab in a tablist */
  TAB: "tab",
  /** A container for tabs */
  TAB_LIST: "tablist",
  /** Content panel for a tab */
  TAB_PANEL: "tabpanel",
  /** A region of the page with important content */
  REGION: "region",
  /** A status message */
  STATUS: "status",
  /** An alert message */
  ALERT: "alert",
  /** A dialog or modal */
  DIALOG: "dialog",
  /** A search input */
  SEARCH: "search",
  /** A text input */
  TEXTBOX: "textbox",
  /** A button */
  BUTTON: "button",
} as const;

export type AriaRole = (typeof AriaRoles)[keyof typeof AriaRoles];

/**
 * Helper to create an accessible label that includes selection state.
 * This is useful for screen readers to announce the current selection.
 */
export function createSelectableLabel(params: {
  readonly label: string;
  readonly selected: boolean;
  readonly index?: number;
  readonly total?: number;
}): string {
  const { label, selected, index, total } = params;

  const parts: string[] = [];

  if (selected) {
    parts.push("(selected)");
  }

  parts.push(label);

  if (index !== undefined && total !== undefined) {
    parts.push(`(${index + 1} of ${total})`);
  }

  return parts.join(" ");
}
