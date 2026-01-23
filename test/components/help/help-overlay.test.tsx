import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { HelpOverlay } from "../../../source/components/help/help-overlay.js";

type RenderInstance = ReturnType<typeof render>;

/**
 * Prepares the stdin mock for ink-testing-library.
 * This is required for components that use useInput.
 */
function prepareStdin(instance: RenderInstance): void {
  Object.assign(instance.stdin, {
    ref: () => undefined,
    unref: () => undefined,
    read: () => null,
  });
}

describe("HelpOverlay", () => {
  it("renders nothing when closed", () => {
    const instance = render(<HelpOverlay isOpen={false} onClose={vi.fn()} />);
    prepareStdin(instance);

    try {
      expect(instance.lastFrame()).toBe("");
    } finally {
      instance.cleanup();
    }
  });

  it("renders help content when open", () => {
    const instance = render(<HelpOverlay isOpen={true} onClose={vi.fn()} />);
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
    const instance = render(<HelpOverlay isOpen={true} onClose={vi.fn()} />);
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
    const instance = render(<HelpOverlay isOpen={true} onClose={vi.fn()} />);
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
    const instance = render(<HelpOverlay isOpen={true} onClose={vi.fn()} />);
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

  it("shows close instructions", () => {
    const instance = render(<HelpOverlay isOpen={true} onClose={vi.fn()} />);
    prepareStdin(instance);

    try {
      const frame = instance.lastFrame();
      expect(frame).toContain("Press ? or Esc to close");
    } finally {
      instance.cleanup();
    }
  });

  it("shows tip about command palette", () => {
    const instance = render(<HelpOverlay isOpen={true} onClose={vi.fn()} />);
    prepareStdin(instance);

    try {
      const frame = instance.lastFrame();
      expect(frame).toContain("Tip:");
      expect(frame).toContain("command palette");
    } finally {
      instance.cleanup();
    }
  });
});
