import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { StatusBar } from "../../../source/components/layout/status-bar.js";
import type { StatusMessage } from "../../../source/types/status-message.js";

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
