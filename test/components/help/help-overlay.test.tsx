import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { HelpOverlay } from "../../../source/components/help/help-overlay.js";
import {
  flushUpdates,
  prepareStdin,
  waitForCondition,
} from "../../utils/ink-test-helpers.js";

describe("HelpOverlay", () => {
  it("renders nothing when closed", () => {
    const instance = render(
      <HelpOverlay isOpen={false} onClose={vi.fn()} onQuit={vi.fn()} />,
    );
    prepareStdin(instance);

    try {
      expect(instance.lastFrame()).toBe("");
    } finally {
      instance.cleanup();
    }
  });

  it("renders help content when open", () => {
    const instance = render(
      <HelpOverlay isOpen={true} onClose={vi.fn()} onQuit={vi.fn()} />,
    );
    prepareStdin(instance);

    try {
      const frame = instance.lastFrame();
      expect(frame).toContain("Keyboard Shortcuts");
      expect(frame).toContain("Navigation");
      expect(frame).toContain("Pane Focus");
      expect(frame).toContain("Actions");
      expect(frame).toContain("Application");
    } finally {
      instance.cleanup();
    }
  });

  it("shows navigation keybindings", () => {
    const instance = render(
      <HelpOverlay isOpen={true} onClose={vi.fn()} onQuit={vi.fn()} />,
    );
    prepareStdin(instance);

    try {
      const frame = instance.lastFrame();
      expect(frame).toContain("j / ↓");
      expect(frame).toContain("Move down");
      expect(frame).toContain("k / ↑");
      expect(frame).toContain("Move up");
    } finally {
      instance.cleanup();
    }
  });

  it("shows pane focus keybindings", () => {
    const instance = render(
      <HelpOverlay isOpen={true} onClose={vi.fn()} onQuit={vi.fn()} />,
    );
    prepareStdin(instance);

    try {
      const frame = instance.lastFrame();
      expect(frame).toContain("Tab");
      expect(frame).toContain("Next pane");
    } finally {
      instance.cleanup();
    }
  });

  it("shows action keybindings", () => {
    const instance = render(
      <HelpOverlay isOpen={true} onClose={vi.fn()} onQuit={vi.fn()} />,
    );
    prepareStdin(instance);

    try {
      const frame = instance.lastFrame();
      expect(frame).toContain(":");
      expect(frame).toContain("Open command palette");
      expect(frame).toContain("y");
      expect(frame).toContain("Copy selected ID");
    } finally {
      instance.cleanup();
    }
  });

  it("shows close and quit instructions", () => {
    const instance = render(
      <HelpOverlay isOpen={true} onClose={vi.fn()} onQuit={vi.fn()} />,
    );
    prepareStdin(instance);

    try {
      const frame = instance.lastFrame();
      expect(frame).toContain("Press ? or Esc to close, or q to quit");
    } finally {
      instance.cleanup();
    }
  });

  it("shows tip about command palette", () => {
    const instance = render(
      <HelpOverlay isOpen={true} onClose={vi.fn()} onQuit={vi.fn()} />,
    );
    prepareStdin(instance);

    try {
      const frame = instance.lastFrame();
      expect(frame).toContain("Tip:");
      expect(frame).toContain("command palette");
    } finally {
      instance.cleanup();
    }
  });

  describe("keyboard input", () => {
    it("calls onClose when ? is pressed", async () => {
      const onClose = vi.fn();
      const onQuit = vi.fn();
      const instance = render(
        <HelpOverlay isOpen={true} onClose={onClose} onQuit={onQuit} />,
      );
      const { send } = prepareStdin(instance);

      try {
        await waitForCondition(
          () => instance.stdin.listenerCount("readable") > 0,
        );

        send("?");
        await flushUpdates();

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onQuit).not.toHaveBeenCalled();
      } finally {
        instance.unmount();
      }
    });

    it("calls onClose when Escape is pressed", async () => {
      const onClose = vi.fn();
      const onQuit = vi.fn();
      const instance = render(
        <HelpOverlay isOpen={true} onClose={onClose} onQuit={onQuit} />,
      );
      const { send } = prepareStdin(instance);

      try {
        await waitForCondition(
          () => instance.stdin.listenerCount("readable") > 0,
        );

        send("\u001B"); // Escape
        await flushUpdates();

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onQuit).not.toHaveBeenCalled();
      } finally {
        instance.unmount();
      }
    });

    it("calls onQuit when lowercase q is pressed", async () => {
      const onClose = vi.fn();
      const onQuit = vi.fn();
      const instance = render(
        <HelpOverlay isOpen={true} onClose={onClose} onQuit={onQuit} />,
      );
      const { send } = prepareStdin(instance);

      try {
        await waitForCondition(
          () => instance.stdin.listenerCount("readable") > 0,
        );

        send("q");
        await flushUpdates();

        expect(onQuit).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
      } finally {
        instance.unmount();
      }
    });

    it("calls onQuit when uppercase Q is pressed", async () => {
      const onClose = vi.fn();
      const onQuit = vi.fn();
      const instance = render(
        <HelpOverlay isOpen={true} onClose={onClose} onQuit={onQuit} />,
      );
      const { send } = prepareStdin(instance);

      try {
        await waitForCondition(
          () => instance.stdin.listenerCount("readable") > 0,
        );

        send("Q");
        await flushUpdates();

        expect(onQuit).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
      } finally {
        instance.unmount();
      }
    });

    it("does not respond to input when overlay is closed", async () => {
      const onClose = vi.fn();
      const onQuit = vi.fn();
      const instance = render(
        <HelpOverlay isOpen={false} onClose={onClose} onQuit={onQuit} />,
      );
      prepareStdin(instance);

      try {
        // Give time for potential listeners to be set up
        await flushUpdates();

        // With isOpen=false, useInput should not be active
        expect(onClose).not.toHaveBeenCalled();
        expect(onQuit).not.toHaveBeenCalled();
      } finally {
        instance.unmount();
      }
    });
  });
});
