import { Text } from "ink";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import type { KeyAction } from "../../source/constants/keybindings.js";
import { useActionHandler } from "../../source/hooks/use-action-handler.js";

type RenderInstance = ReturnType<typeof render>;

function prepareStdin(instance: RenderInstance): void {
  Object.assign(instance.stdin, {
    ref: () => undefined,
    unref: () => undefined,
    read: () => null,
  });
}

interface TestComponentProps {
  readonly focusedPane: "navigator" | "results" | "detail";
  readonly commandPaletteOpen?: boolean;
  readonly commandPaletteMaxIndex?: number;
  readonly navigatorItemCount?: number;
  readonly resultsItemCount?: number;
  readonly dispatch: React.Dispatch<unknown>;
  readonly exit?: () => void;
  readonly onCopyId?: () => void;
  readonly onOpenInBrowser?: () => void;
  readonly onRefresh?: () => void;
  readonly onToggleDebug?: () => void;
  readonly onToggleHelp?: () => void;
  readonly onAction: (handler: (action: KeyAction) => void) => void;
}

function TestComponent({
  focusedPane,
  commandPaletteOpen = false,
  commandPaletteMaxIndex = 0,
  navigatorItemCount = 10,
  resultsItemCount = 10,
  dispatch,
  exit = vi.fn(),
  onCopyId = vi.fn(),
  onOpenInBrowser = vi.fn(),
  onRefresh = vi.fn(),
  onToggleDebug = vi.fn(),
  onToggleHelp = vi.fn(),
  onAction,
}: TestComponentProps) {
  const handleAction = useActionHandler({
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
  });

  onAction(handleAction);

  return <Text>Test Component</Text>;
}

describe("useActionHandler", () => {
  describe("jumpToTop", () => {
    it("dispatches SELECT_CATEGORY with index 0 when navigator is focused", () => {
      const dispatch = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="navigator"
          navigatorItemCount={5}
          dispatch={dispatch}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("jumpToTop");
        expect(dispatch).toHaveBeenCalledWith({
          type: "SELECT_CATEGORY",
          index: 0,
        });
      } finally {
        instance.unmount();
      }
    });

    it("dispatches SELECT_RESULT with index 0 when results is focused", () => {
      const dispatch = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="results"
          resultsItemCount={5}
          dispatch={dispatch}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("jumpToTop");
        expect(dispatch).toHaveBeenCalledWith({
          type: "SELECT_RESULT",
          index: 0,
        });
      } finally {
        instance.unmount();
      }
    });

    it("does nothing when navigator has no items", () => {
      const dispatch = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="navigator"
          navigatorItemCount={0}
          dispatch={dispatch}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("jumpToTop");
        expect(dispatch).not.toHaveBeenCalled();
      } finally {
        instance.unmount();
      }
    });
  });

  describe("jumpToBottom", () => {
    it("dispatches SELECT_CATEGORY with last index when navigator is focused", () => {
      const dispatch = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="navigator"
          navigatorItemCount={5}
          dispatch={dispatch}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("jumpToBottom");
        expect(dispatch).toHaveBeenCalledWith({
          type: "SELECT_CATEGORY",
          index: 4,
        });
      } finally {
        instance.unmount();
      }
    });

    it("dispatches SELECT_RESULT with last index when results is focused", () => {
      const dispatch = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="results"
          resultsItemCount={8}
          dispatch={dispatch}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("jumpToBottom");
        expect(dispatch).toHaveBeenCalledWith({
          type: "SELECT_RESULT",
          index: 7,
        });
      } finally {
        instance.unmount();
      }
    });

    it("does nothing when results has no items", () => {
      const dispatch = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="results"
          resultsItemCount={0}
          dispatch={dispatch}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("jumpToBottom");
        expect(dispatch).not.toHaveBeenCalled();
      } finally {
        instance.unmount();
      }
    });
  });

  describe("simple actions", () => {
    it("dispatches FOCUS_NEXT_PANE for nextPane action", () => {
      const dispatch = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="navigator"
          dispatch={dispatch}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("nextPane");
        expect(dispatch).toHaveBeenCalledWith({ type: "FOCUS_NEXT_PANE" });
      } finally {
        instance.unmount();
      }
    });

    it("dispatches FOCUS_PANE for focusResults action", () => {
      const dispatch = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="navigator"
          dispatch={dispatch}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("focusResults");
        expect(dispatch).toHaveBeenCalledWith({
          type: "FOCUS_PANE",
          paneId: "results",
        });
      } finally {
        instance.unmount();
      }
    });
  });

  describe("callback actions", () => {
    it("calls onCopyId for copyId action", () => {
      const dispatch = vi.fn();
      const onCopyId = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="navigator"
          dispatch={dispatch}
          onCopyId={onCopyId}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("copyId");
        expect(onCopyId).toHaveBeenCalledTimes(1);
      } finally {
        instance.unmount();
      }
    });

    it("calls onToggleHelp for toggleHelp action", () => {
      const dispatch = vi.fn();
      const onToggleHelp = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="navigator"
          dispatch={dispatch}
          onToggleHelp={onToggleHelp}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("toggleHelp");
        expect(onToggleHelp).toHaveBeenCalledTimes(1);
      } finally {
        instance.unmount();
      }
    });
  });

  describe("quit action", () => {
    it("calls exit for quit action", () => {
      const dispatch = vi.fn();
      const exit = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="navigator"
          dispatch={dispatch}
          exit={exit}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("quit");
        expect(exit).toHaveBeenCalledTimes(1);
      } finally {
        instance.unmount();
      }
    });
  });

  describe("page navigation", () => {
    it("dispatches NAVIGATE_CATEGORY_BY_OFFSET for pageUp when navigator focused", () => {
      const dispatch = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="navigator"
          dispatch={dispatch}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("pageUp");
        expect(dispatch).toHaveBeenCalledWith({
          type: "NAVIGATE_CATEGORY_BY_OFFSET",
          offset: -10,
        });
      } finally {
        instance.unmount();
      }
    });

    it("dispatches NAVIGATE_RESULT_BY_OFFSET for pageDown when results focused", () => {
      const dispatch = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="results"
          dispatch={dispatch}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("pageDown");
        expect(dispatch).toHaveBeenCalledWith({
          type: "NAVIGATE_RESULT_BY_OFFSET",
          offset: 10,
        });
      } finally {
        instance.unmount();
      }
    });
  });

  describe("moveUp with command palette open", () => {
    it("dispatches NAVIGATE_COMMAND when command palette is open", () => {
      const dispatch = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="navigator"
          commandPaletteOpen={true}
          commandPaletteMaxIndex={5}
          dispatch={dispatch}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("moveUp");
        expect(dispatch).toHaveBeenCalledWith({
          type: "NAVIGATE_COMMAND",
          direction: "up",
          maxIndex: 5,
        });
      } finally {
        instance.unmount();
      }
    });
  });

  describe("tab navigation", () => {
    it("dispatches NAVIGATE_TAB for nextTab when detail pane focused", () => {
      const dispatch = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="detail"
          dispatch={dispatch}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("nextTab");
        expect(dispatch).toHaveBeenCalledWith({
          type: "NAVIGATE_TAB",
          direction: "next",
        });
      } finally {
        instance.unmount();
      }
    });

    it("does nothing for nextTab when navigator is focused", () => {
      const dispatch = vi.fn();
      let actionHandler: (action: KeyAction) => void = vi.fn();

      const instance = render(
        <TestComponent
          focusedPane="navigator"
          dispatch={dispatch}
          onAction={(handler) => {
            actionHandler = handler;
          }}
        />,
      );
      prepareStdin(instance);

      try {
        actionHandler("nextTab");
        expect(dispatch).not.toHaveBeenCalled();
      } finally {
        instance.unmount();
      }
    });
  });
});
