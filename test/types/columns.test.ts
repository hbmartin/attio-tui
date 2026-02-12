import { describe, expect, it } from "vitest";
import { Columns } from "../../source/types/columns.js";
import { parseObjectSlug } from "../../source/types/ids.js";
import type {
  NavigatorCategory,
  ObjectDrillState,
} from "../../source/types/navigation.js";

describe("Columns.getEntityKey", () => {
  it("returns undefined for undefined category", () => {
    expect(Columns.getEntityKey(undefined)).toBeUndefined();
  });

  it("returns object-slug for object category", () => {
    const category: NavigatorCategory = {
      type: "object",
      objectSlug: parseObjectSlug("companies"),
    };
    expect(Columns.getEntityKey(category)).toBe("object-companies");
  });

  it("returns 'list' for list category", () => {
    const category: NavigatorCategory = { type: "list" };
    expect(Columns.getEntityKey(category)).toBe("list");
  });

  it("returns 'list' for lists category", () => {
    const category: NavigatorCategory = { type: "lists" };
    expect(Columns.getEntityKey(category)).toBe("list");
  });

  it("returns 'objects' for objects category at top level", () => {
    const category: NavigatorCategory = { type: "objects" };
    expect(Columns.getEntityKey(category)).toBe("objects");
  });

  it("returns 'objects' for objects category when objectDrill is at objects level", () => {
    const category: NavigatorCategory = { type: "objects" };
    const objectDrill: ObjectDrillState = { level: "objects" };
    expect(Columns.getEntityKey(category, objectDrill)).toBe("objects");
  });

  it("returns object-slug for objects category when drilled into records", () => {
    const category: NavigatorCategory = { type: "objects" };
    const objectDrill: ObjectDrillState = {
      level: "records",
      objectSlug: parseObjectSlug("deals"),
      objectName: "Deals",
    };
    expect(Columns.getEntityKey(category, objectDrill)).toBe("object-deals");
  });

  it.each([
    "notes",
    "tasks",
    "meetings",
    "webhooks",
  ] as const)("returns '%s' for %s category", (type) => {
    const category: NavigatorCategory = { type };
    expect(Columns.getEntityKey(category)).toBe(type);
  });

  it("ignores objectDrill for non-objects categories", () => {
    const category: NavigatorCategory = {
      type: "object",
      objectSlug: parseObjectSlug("people"),
    };
    const objectDrill: ObjectDrillState = {
      level: "records",
      objectSlug: parseObjectSlug("deals"),
      objectName: "Deals",
    };
    expect(Columns.getEntityKey(category, objectDrill)).toBe("object-people");
  });
});
