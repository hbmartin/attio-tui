import { useCallback } from "react";
import type { KeyAction } from "../constants/keybindings.js";
import type { AppAction } from "../state/app-state.js";
import type { PaneId } from "../types/navigation.js";

interface UseActionHandlerOptions {
  readonly focusedPane: PaneId;
  readonly commandPaletteOpen: boolean;
  readonly dispatch: React.Dispatch<AppAction>;
  readonly exit: () => void;
  readonly onCopyId: () => void;
  readonly onOpenInBrowser: () => void;
  readonly onRefresh: () => void;
  readonly onToggleDebug: () => void;
}

// Action dispatch map for simple actions
const SIMPLE_ACTION_MAP: Partial<Record<KeyAction, AppAction>> = {
  nextPane: { type: "FOCUS_NEXT_PANE" },
  previousPane: { type: "FOCUS_PREVIOUS_PANE" },
  focusNavigator: { type: "FOCUS_PANE", paneId: "navigator" },
  focusResults: { type: "FOCUS_PANE", paneId: "results" },
  focusDetail: { type: "FOCUS_PANE", paneId: "detail" },
  openCommandPalette: { type: "OPEN_COMMAND_PALETTE" },
  closeCommandPalette: { type: "CLOSE_COMMAND_PALETTE" },
  moveLeft: { type: "FOCUS_PREVIOUS_PANE" },
};

function handleMoveUp(
  focusedPane: PaneId,
  commandPaletteOpen: boolean,
  dispatch: React.Dispatch<AppAction>,
): void {
  if (commandPaletteOpen) {
    dispatch({ type: "NAVIGATE_COMMAND", direction: "up" });
    return;
  }
  if (focusedPane === "navigator") {
    dispatch({ type: "NAVIGATE_CATEGORY", direction: "up" });
  } else if (focusedPane === "results") {
    dispatch({ type: "NAVIGATE_RESULT", direction: "up" });
  }
}

function handleMoveDown(
  focusedPane: PaneId,
  commandPaletteOpen: boolean,
  dispatch: React.Dispatch<AppAction>,
): void {
  if (commandPaletteOpen) {
    dispatch({ type: "NAVIGATE_COMMAND", direction: "down" });
    return;
  }
  if (focusedPane === "navigator") {
    dispatch({ type: "NAVIGATE_CATEGORY", direction: "down" });
  } else if (focusedPane === "results") {
    dispatch({ type: "NAVIGATE_RESULT", direction: "down" });
  }
}

function handleMoveRight(
  focusedPane: PaneId,
  dispatch: React.Dispatch<AppAction>,
): void {
  if (focusedPane === "navigator") {
    dispatch({ type: "FOCUS_PANE", paneId: "results" });
  } else if (focusedPane === "results") {
    dispatch({ type: "FOCUS_PANE", paneId: "detail" });
  }
}

function handleTabNavigation(
  action: "previousTab" | "nextTab",
  focusedPane: PaneId,
  dispatch: React.Dispatch<AppAction>,
): void {
  if (focusedPane === "detail") {
    const direction = action === "previousTab" ? "previous" : "next";
    dispatch({ type: "NAVIGATE_TAB", direction });
  }
}

export function useActionHandler(options: UseActionHandlerOptions) {
  const {
    focusedPane,
    commandPaletteOpen,
    dispatch,
    exit,
    onCopyId,
    onOpenInBrowser,
    onRefresh,
    onToggleDebug,
  } = options;

  return useCallback(
    (action: KeyAction) => {
      // Check simple action map first
      const simpleAction = SIMPLE_ACTION_MAP[action];
      if (simpleAction) {
        dispatch(simpleAction);
        return;
      }

      const actionHandlers: Partial<Record<KeyAction, () => void>> = {
        copyId: onCopyId,
        openInBrowser: onOpenInBrowser,
        refresh: onRefresh,
        toggleDebug: onToggleDebug,
      };

      const actionHandler = actionHandlers[action];
      if (actionHandler) {
        actionHandler();
        return;
      }

      // Handle complex actions
      switch (action) {
        case "moveUp":
          handleMoveUp(focusedPane, commandPaletteOpen, dispatch);
          break;
        case "moveDown":
          handleMoveDown(focusedPane, commandPaletteOpen, dispatch);
          break;
        case "moveRight":
          handleMoveRight(focusedPane, dispatch);
          break;
        case "previousTab":
        case "nextTab":
          handleTabNavigation(action, focusedPane, dispatch);
          break;
        case "quit":
          exit();
          break;
        default:
          // Unhandled actions are ignored
          break;
      }
    },
    [
      focusedPane,
      commandPaletteOpen,
      dispatch,
      exit,
      onCopyId,
      onOpenInBrowser,
      onRefresh,
      onToggleDebug,
    ],
  );
}
