import { describe, expect, it } from "vitest";
import {
  ALL_WEBHOOK_EVENTS,
  getEventLabel,
  WEBHOOK_EVENT_CATEGORIES,
} from "./webhook-events.js";

describe("webhook-events", () => {
  describe("WEBHOOK_EVENT_CATEGORIES", () => {
    it("should have categories defined", () => {
      expect(WEBHOOK_EVENT_CATEGORIES.length).toBeGreaterThan(0);
    });

    it("should have events in each category", () => {
      for (const category of WEBHOOK_EVENT_CATEGORIES) {
        expect(category.name).toBeTruthy();
        expect(category.events.length).toBeGreaterThan(0);
      }
    });

    it("should have unique event values across all categories", () => {
      const allValues = WEBHOOK_EVENT_CATEGORIES.flatMap((cat) =>
        cat.events.map((e) => e.value),
      );
      const uniqueValues = new Set(allValues);
      expect(uniqueValues.size).toBe(allValues.length);
    });
  });

  describe("ALL_WEBHOOK_EVENTS", () => {
    it("should contain all events from categories", () => {
      const expectedCount = WEBHOOK_EVENT_CATEGORIES.reduce(
        (sum, cat) => sum + cat.events.length,
        0,
      );
      expect(ALL_WEBHOOK_EVENTS.length).toBe(expectedCount);
    });

    it("should include common event types", () => {
      const eventValues = ALL_WEBHOOK_EVENTS.map((e) => e.value);
      expect(eventValues).toContain("record.created");
      expect(eventValues).toContain("record.updated");
      expect(eventValues).toContain("record.deleted");
      expect(eventValues).toContain("note.created");
      expect(eventValues).toContain("task.created");
    });
  });

  describe("getEventLabel", () => {
    it("should return label for known event", () => {
      expect(getEventLabel("record.created")).toBe("Record created");
      expect(getEventLabel("note.created")).toBe("Note created");
    });

    it("should return event value for unknown event", () => {
      expect(getEventLabel("unknown.event")).toBe("unknown.event");
    });
  });
});
