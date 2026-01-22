import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatMeetingTime,
  getTaskSubtitle,
  truncateText,
} from "./formatting.js";

describe("formatting helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("truncates text with ellipsis", () => {
    expect(truncateText("Hello world", 8)).toBe("Hello...");
    expect(truncateText("Short", 8)).toBe("Short");
  });

  it("formats meeting time ranges", () => {
    vi.spyOn(Date.prototype, "toLocaleDateString").mockReturnValue(
      "01/22/2026",
    );
    const timeSpy = vi
      .spyOn(Date.prototype, "toLocaleTimeString")
      .mockReturnValueOnce("09:00")
      .mockReturnValueOnce("10:00");

    const result = formatMeetingTime(
      "2026-01-22T09:00:00Z",
      "2026-01-22T10:00:00Z",
    );

    expect(result).toBe("01/22/2026 09:00 - 10:00");
    expect(timeSpy).toHaveBeenCalledWith([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  });

  it("builds task subtitles", () => {
    vi.spyOn(Date.prototype, "toLocaleDateString").mockReturnValue(
      "01/22/2026",
    );

    expect(
      getTaskSubtitle({
        isCompleted: true,
        deadlineAt: "2026-01-22T00:00:00Z",
      }),
    ).toBe("Completed");

    expect(
      getTaskSubtitle({
        isCompleted: false,
        deadlineAt: "2026-01-22T00:00:00Z",
      }),
    ).toBe("Due: 01/22/2026");

    expect(
      getTaskSubtitle({
        isCompleted: false,
        deadlineAt: null,
      }),
    ).toBe("No deadline");
  });
});
