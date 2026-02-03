import { describe, expect, it } from "vitest";
import type { RecordValue } from "../../source/types/attio.js";
import { formatValue } from "../../source/utils/formatting.js";

const baseValue = {
  active_from: "2025-01-01T00:00:00Z",
  active_until: null,
  created_by_actor: {},
};

function textValue(value: string): RecordValue {
  return {
    ...baseValue,
    attribute_type: "text",
    value,
  };
}

function selectValue(title: string): RecordValue {
  return {
    ...baseValue,
    attribute_type: "select",
    option: {
      id: {
        workspace_id: "workspace-1",
        object_id: "object-1",
        attribute_id: "attribute-1",
        option_id: "option-1",
      },
      title,
      is_archived: false,
    },
  };
}

function recordReferenceValue(
  targetObject: string,
  targetRecordId: string,
): RecordValue {
  return {
    ...baseValue,
    attribute_type: "record-reference",
    target_object: targetObject,
    target_record_id: targetRecordId,
  };
}

function personalNameValue(firstName: string, lastName: string): RecordValue {
  return {
    ...baseValue,
    attribute_type: "personal-name",
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`,
  };
}

describe("formatValue", () => {
  it("formats text values", () => {
    expect(formatValue([textValue("Acme Corp")])).toBe("Acme Corp");
  });

  it("formats select options", () => {
    expect(formatValue([selectValue("Prospect")])).toBe("Prospect");
  });

  it("formats record references", () => {
    expect(formatValue([recordReferenceValue("people", "rec-123")])).toBe(
      "people/rec-123",
    );
  });

  it("formats personal names", () => {
    expect(formatValue([personalNameValue("Ada", "Lovelace")])).toBe(
      "Ada Lovelace",
    );
  });

  it("caps long arrays at MAX_FORMATTED_LENGTH", () => {
    const manyValues = Array.from({ length: 50 }, (_, i) =>
      textValue(`Item number ${i} with extra padding text`),
    );
    const result = formatValue(manyValues);
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it("caps JSON.stringify fallback for unrecognized types", () => {
    const unknownValue: RecordValue = {
      ...baseValue,
      attribute_type: "unknown",
      some_long_field: "x".repeat(300),
    };
    const result = formatValue(unknownValue);
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it("returns dash for empty arrays", () => {
    expect(formatValue([])).toBe("-");
  });

  it("joins multiple text values with commas", () => {
    expect(formatValue([textValue("A"), textValue("B"), textValue("C")])).toBe(
      "A, B, C",
    );
  });
});
