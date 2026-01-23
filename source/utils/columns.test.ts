import { describe, expect, it } from "vitest";
import { DEFAULT_COLUMNS } from "../constants/default-columns.js";
import type { ColumnsConfig } from "../schemas/columns-schema.js";
import { resolveColumns } from "./columns.js";

describe("resolveColumns", () => {
  it("uses configured columns when available", () => {
    const columnsConfig: ColumnsConfig = {
      ...DEFAULT_COLUMNS,
      "object-companies": [{ attribute: "name" }],
    };

    const resolved = resolveColumns({
      entityKey: "object-companies",
      columnsConfig,
    });
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.attribute).toBe("name");
    expect(resolved[0]?.label).toBe("Name");
  });

  it("falls back to defaults when config is invalid", () => {
    const columnsConfig: ColumnsConfig = {
      ...DEFAULT_COLUMNS,
      "object-companies": [{ attribute: "does-not-exist" }],
    };

    const resolved = resolveColumns({
      entityKey: "object-companies",
      columnsConfig,
    });
    const defaults = DEFAULT_COLUMNS["object-companies"];
    if (!defaults) {
      throw new Error("Expected defaults for object-companies");
    }
    expect(resolved.map((column) => column.attribute)).toEqual(
      defaults.map((column) => column.attribute),
    );
  });

  it("deduplicates configured columns by attribute", () => {
    const columnsConfig: ColumnsConfig = {
      ...DEFAULT_COLUMNS,
      "object-companies": [
        { attribute: "name", label: "Primary", width: 12 },
        { attribute: "name", label: "Secondary", width: 40 },
      ],
    };

    const resolved = resolveColumns({
      entityKey: "object-companies",
      columnsConfig,
    });

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.attribute).toBe("name");
    expect(resolved[0]?.label).toBe("Primary");
    expect(resolved[0]?.width).toBe(Math.max(12, "Primary".length, 1));
  });

  it("falls back to default object columns for unknown object key", () => {
    const columnsConfig: ColumnsConfig = {
      ...DEFAULT_COLUMNS,
    };

    const resolved = resolveColumns({
      entityKey: "object-custom",
      columnsConfig,
    });
    expect(resolved[0]?.attribute).toBe("title");
  });
});
