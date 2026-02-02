import { useCallback } from "react";
import type { KeyAction } from "../constants/keybindings.js";
import type { AppAction } from "../state/app-state.js";
import type { PaneId } from "../types/navigation.js";

/** Number of items to navigate for page up/down actions */
const PAGE_SIZE = 10;

interface UseActionHandlerOptions {
  readonly focusedPane: PaneId;
  readonly commandPaletteOpen: boolean;
  readonly commandPaletteMaxIndex: number;
  readonly navigatorItemCount: number;
  readonly resultsItemCount: number;
  readonly dispatch: React.Dispatch<AppAction>;
  readonly exit: () => void;
  readonly onCopyId: () => void;
  readonly onOpenInBrowser: () => void;
  readonly onRefresh: () => void;
  readonly onToggleDebug: () => void;
  readonly onToggleHelp: () => void;
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
  commandPaletteMaxIndex: number,
  dispatch: React.Dispatch<AppAction>,
): void {
  if (commandPaletteOpen) {
    dispatch({
      type: "NAVIGATE_COMMAND",
      direction: "up",
      maxIndex: commandPaletteMaxIndex,
    });
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
  commandPaletteMaxIndex: number,
  dispatch: React.Dispatch<AppAction>,
): void {
  if (commandPaletteOpen) {
    dispatch({
      type: "NAVIGATE_COMMAND",
      direction: "down",
      maxIndex: commandPaletteMaxIndex,
    });
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

interface HandleJumpOptions {
  readonly position: "top" | "bottom";
  readonly focusedPane: PaneId;
  readonly navigatorItemCount: number;
  readonly resultsItemCount: number;
  readonly dispatch: React.Dispatch<AppAction>;
}

function handleJump(options: HandleJumpOptions): void {
  const {
    position,
    focusedPane,
    navigatorItemCount,
    resultsItemCount,
    dispatch,
  } = options;
  const getIndex = (count: number) => (position === "top" ? 0 : count - 1);

  if (focusedPane === "navigator" && navigatorItemCount > 0) {
    dispatch({ type: "SELECT_CATEGORY", index: getIndex(navigatorItemCount) });
  } else if (focusedPane === "results" && resultsItemCount > 0) {
    dispatch({ type: "SELECT_RESULT", index: getIndex(resultsItemCount) });
  }
}

function handlePageNavigation(
  direction: "up" | "down",
  focusedPane: PaneId,
  dispatch: React.Dispatch<AppAction>,
): void {
  if (focusedPane === "navigator") {
    dispatch({
      type: "NAVIGATE_CATEGORY_BY_OFFSET",
      offset: direction === "up" ? -PAGE_SIZE : PAGE_SIZE,
    });
  } else if (focusedPane === "results") {
    dispatch({
      type: "NAVIGATE_RESULT_BY_OFFSET",
      offset: direction === "up" ? -PAGE_SIZE : PAGE_SIZE,
    });
  }
}

export function useActionHandler(options: UseActionHandlerOptions) {
  const {
    focusedPane,
    commandPaletteOpen,
    commandPaletteMaxIndex,
    navigatorItemCount,
    resultsItemCount,
    dispatch,
    exit,
    onCopyId,
    onOpenInBrowser,
    onRefresh,
    onToggleDebug,
    onToggleHelp,
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
        toggleHelp: onToggleHelp,
      };

      const actionHandler = actionHandlers[action];
      if (actionHandler) {
        actionHandler();
        return;
      }

      // Handle complex actions
      switch (action) {
        case "moveUp":
          handleMoveUp(
            focusedPane,
            commandPaletteOpen,
            commandPaletteMaxIndex,
            dispatch,
          );
          break;
        case "moveDown":
          handleMoveDown(
            focusedPane,
            commandPaletteOpen,
            commandPaletteMaxIndex,
            dispatch,
          );
          break;
        case "moveRight":
          handleMoveRight(focusedPane, dispatch);
          break;
        case "previousTab":
        case "nextTab":
          handleTabNavigation(action, focusedPane, dispatch);
          break;
        case "jumpToTop":
          handleJump({
            position: "top",
            focusedPane,
            navigatorItemCount,
            resultsItemCount,
            dispatch,
          });
          break;
        case "jumpToBottom":
          handleJump({
            position: "bottom",
            focusedPane,
            navigatorItemCount,
            resultsItemCount,
            dispatch,
          });
          break;
        case "pageUp":
          handlePageNavigation("up", focusedPane, dispatch);
          break;
        case "pageDown":
          handlePageNavigation("down", focusedPane, dispatch);
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
      commandPaletteMaxIndex,
      navigatorItemCount,
      resultsItemCount,
      dispatch,
      exit,
      onCopyId,
      onOpenInBrowser,
      onRefresh,
      onToggleDebug,
      onToggleHelp,
    ],
  );
}
