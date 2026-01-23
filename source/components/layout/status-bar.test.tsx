import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import type { StatusMessage } from "../../types/status-message.js";
import { StatusBar } from "./status-bar.js";

describe("StatusBar", () => {
  it("renders a status message when provided", () => {
    const statusMessage: StatusMessage = {
      text: "Refresh failed",
      tone: "error",
    };

    const instance = render(
      <StatusBar
        focusedPane="navigator"
        itemCount={2}
        selectedIndex={0}
        loading={false}
        statusMessage={statusMessage}
      />,
    );

    try {
      expect(instance.lastFrame()).toContain("Refresh failed");
    } finally {
      instance.cleanup();
    }
  });
});
