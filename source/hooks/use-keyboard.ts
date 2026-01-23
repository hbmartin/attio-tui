import { useInput } from "ink";
import { useCallback } from "react";
import {
  COMMAND_PALETTE_KEYBINDINGS,
  DETAIL_KEYBINDINGS,
  findKeyAction,
  GLOBAL_KEYBINDINGS,
  type KeyAction,
  LIST_KEYBINDINGS,
} from "../constants/keybindings.js";
import type { PaneId } from "../types/navigation.js";

// Ink's key event object structure
interface InkKeyEvent {
  readonly upArrow: boolean;
  readonly downArrow: boolean;
  readonly leftArrow: boolean;
  readonly rightArrow: boolean;
  readonly return: boolean;
  readonly escape: boolean;
  readonly ctrl: boolean;
  readonly shift: boolean;
  readonly meta: boolean;
  readonly tab: boolean;
  readonly backspace: boolean;
}

export interface KeyboardInput {
  readonly key: string;
  readonly ctrl: boolean;
  readonly shift: boolean;
  readonly meta: boolean;
}

export interface UseKeyboardOptions {
  readonly focusedPane: PaneId;
  readonly commandPaletteOpen: boolean;
  readonly onAction: (action: KeyAction) => void;
  readonly enabled?: boolean;
}

// Maps Ink's key object to our normalized format
function normalizeInput(input: string, key: InkKeyEvent): KeyboardInput {
  let normalizedKey = input;

  if (key.upArrow) {
    normalizedKey = "upArrow";
  } else if (key.downArrow) {
    normalizedKey = "downArrow";
  } else if (key.leftArrow) {
    normalizedKey = "leftArrow";
  } else if (key.rightArrow) {
    normalizedKey = "rightArrow";
  } else if (key.return) {
    normalizedKey = "return";
  } else if (key.escape) {
    normalizedKey = "escape";
  } else if (key.tab) {
    normalizedKey = "tab";
  } else if (key.backspace) {
    normalizedKey = "backspace";
  }

  return {
    key: normalizedKey,
    ctrl: key.ctrl,
    shift: key.shift,
    meta: key.meta,
  };
}

// Get pane-specific keybindings based on focused pane
function getPaneKeybindings(paneId: PaneId) {
  switch (paneId) {
    case "navigator":
    case "results":
      return LIST_KEYBINDINGS;
    case "detail":
      return DETAIL_KEYBINDINGS;
  }
}

export function useKeyboard(options: UseKeyboardOptions): void {
  const { focusedPane, commandPaletteOpen, onAction, enabled = true } = options;

  const handleInput = useCallback(
    (input: string, key: InkKeyEvent) => {
      const normalizedInput = normalizeInput(input, key);

      // Priority 1: Command palette keybindings when open
      if (commandPaletteOpen) {
        const action = findKeyAction(
          normalizedInput,
          COMMAND_PALETTE_KEYBINDINGS,
        );
        if (action) {
          onAction(action);
          return;
        }
        // Allow typing in command palette - don't block other keys
        return;
      }

      // Priority 2: Global keybindings
      const globalAction = findKeyAction(normalizedInput, GLOBAL_KEYBINDINGS);
      if (globalAction) {
        onAction(globalAction);
        return;
      }

      // Priority 3: Pane-specific keybindings
      const paneBindings = getPaneKeybindings(focusedPane);
      const paneAction = findKeyAction(normalizedInput, paneBindings);
      if (paneAction) {
        onAction(paneAction);
      }
    },
    [focusedPane, commandPaletteOpen, onAction],
  );

  useInput(handleInput, { isActive: enabled });
}
