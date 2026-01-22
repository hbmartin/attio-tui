import { useCallback, useState } from "react";
import { PANE_ORDER, type PaneId } from "../types/navigation.js";

interface UseFocusPaneResult {
  readonly focusedPane: PaneId;
  readonly focusPane: (paneId: PaneId) => void;
  readonly focusNextPane: () => void;
  readonly focusPreviousPane: () => void;
  readonly isPaneFocused: (paneId: PaneId) => boolean;
}

export function useFocusPane(
  initialPane: PaneId = "navigator",
): UseFocusPaneResult {
  const [focusedPane, setFocusedPane] = useState<PaneId>(initialPane);

  const focusPane = useCallback((paneId: PaneId) => {
    setFocusedPane(paneId);
  }, []);

  const focusNextPane = useCallback(() => {
    setFocusedPane((current) => {
      const currentIndex = PANE_ORDER.indexOf(current);
      const nextIndex = (currentIndex + 1) % PANE_ORDER.length;
      return PANE_ORDER[nextIndex] ?? "navigator";
    });
  }, []);

  const focusPreviousPane = useCallback(() => {
    setFocusedPane((current) => {
      const currentIndex = PANE_ORDER.indexOf(current);
      const previousIndex =
        (currentIndex - 1 + PANE_ORDER.length) % PANE_ORDER.length;
      return PANE_ORDER[previousIndex] ?? "navigator";
    });
  }, []);

  const isPaneFocused = useCallback(
    (paneId: PaneId) => focusedPane === paneId,
    [focusedPane],
  );

  return {
    focusedPane,
    focusPane,
    focusNextPane,
    focusPreviousPane,
    isPaneFocused,
  };
}
