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
      const frame = instance.lastFrame();
      // The status message may wrap across lines in narrow terminals,
      // so check for both parts separately
      expect(frame).toContain("Refresh");
      expect(frame).toContain("failed");
    } finally {
      instance.cleanup();
    }
  });
});
