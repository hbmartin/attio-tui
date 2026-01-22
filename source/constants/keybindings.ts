// Keybinding definitions for the TUI
// Supports both vim-style and arrow key navigation

export type KeyAction =
  // Navigation
  | "moveUp"
  | "moveDown"
  | "moveLeft"
  | "moveRight"
  | "selectItem"
  | "goBack"
  // Pane focus
  | "nextPane"
  | "previousPane"
  | "focusNavigator"
  | "focusResults"
  | "focusDetail"
  // Detail tabs
  | "nextTab"
  | "previousTab"
  // Command palette
  | "openCommandPalette"
  | "closeCommandPalette"
  // Actions
  | "copyId"
  | "openInBrowser"
  | "refresh"
  | "toggleDebug"
  // App
  | "quit";

export interface KeyBinding {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly meta?: boolean;
  readonly action: KeyAction;
}

// Global keybindings - always active
export const GLOBAL_KEYBINDINGS: readonly KeyBinding[] = [
  // Pane navigation
  { key: "tab", action: "nextPane" },
  { key: "tab", shift: true, action: "previousPane" },
  { key: "1", action: "focusNavigator" },
  { key: "2", action: "focusResults" },
  { key: "3", action: "focusDetail" },

  // Command palette
  { key: ":", action: "openCommandPalette" },
  { key: "escape", action: "closeCommandPalette" },

  // Quick actions
  { key: "c", ctrl: true, action: "copyId" },
  { key: "o", ctrl: true, action: "openInBrowser" },
  { key: "r", ctrl: true, action: "refresh" },
  { key: "d", ctrl: true, action: "toggleDebug" },

  // App control
  { key: "q", action: "quit" },
  { key: "c", ctrl: true, action: "quit" },
] as const;

// List navigation keybindings - active when a list pane is focused
export const LIST_KEYBINDINGS: readonly KeyBinding[] = [
  // Vim-style navigation
  { key: "j", action: "moveDown" },
  { key: "k", action: "moveUp" },
  { key: "h", action: "moveLeft" },
  { key: "l", action: "moveRight" },

  // Arrow keys
  { key: "downArrow", action: "moveDown" },
  { key: "upArrow", action: "moveUp" },
  { key: "leftArrow", action: "moveLeft" },
  { key: "rightArrow", action: "moveRight" },

  // Selection
  { key: "return", action: "selectItem" },
  { key: " ", action: "selectItem" },

  // Back navigation
  { key: "backspace", action: "goBack" },
] as const;

// Detail pane keybindings
export const DETAIL_KEYBINDINGS: readonly KeyBinding[] = [
  // Tab navigation
  { key: "h", action: "previousTab" },
  { key: "l", action: "nextTab" },
  { key: "leftArrow", action: "previousTab" },
  { key: "rightArrow", action: "nextTab" },

  // Vim-style vertical scroll (within content)
  { key: "j", action: "moveDown" },
  { key: "k", action: "moveUp" },
  { key: "downArrow", action: "moveDown" },
  { key: "upArrow", action: "moveUp" },
] as const;

// Command palette keybindings
export const COMMAND_PALETTE_KEYBINDINGS: readonly KeyBinding[] = [
  { key: "downArrow", action: "moveDown" },
  { key: "upArrow", action: "moveUp" },
  { key: "j", ctrl: true, action: "moveDown" },
  { key: "k", ctrl: true, action: "moveUp" },
  { key: "return", action: "selectItem" },
  { key: "escape", action: "closeCommandPalette" },
] as const;

// Match a keyboard event against a keybinding
export function matchesKeybinding(
  input: {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    meta?: boolean;
  },
  binding: KeyBinding,
): boolean {
  if (input.key !== binding.key) {
    return false;
  }
  if ((binding.ctrl ?? false) !== (input.ctrl ?? false)) {
    return false;
  }
  if ((binding.shift ?? false) !== (input.shift ?? false)) {
    return false;
  }
  if ((binding.meta ?? false) !== (input.meta ?? false)) {
    return false;
  }
  return true;
}

// Find the action for a keyboard event from a list of bindings
export function findKeyAction(
  input: {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    meta?: boolean;
  },
  bindings: readonly KeyBinding[],
): KeyAction | undefined {
  for (const binding of bindings) {
    if (matchesKeybinding(input, binding)) {
      return binding.action;
    }
  }
  return;
}
