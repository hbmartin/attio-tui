import { describe, expect, it } from "vitest";
import { getRecordSubtitle, getRecordTitle } from "./entities.js";

describe("record helpers", () => {
  it("extracts a record title from common fields", () => {
    const values = {
      name: [{ value: "Acme Corp" }],
      title: [{ value: "Ignored" }],
    };

    expect(getRecordTitle(values)).toBe("Acme Corp");
  });

  it("falls back to Unnamed when no title is present", () => {
    const values = {
      status: [{ label: "Active" }],
    };

    expect(getRecordTitle(values)).toBe("Unnamed");
  });

  it("extracts a record subtitle from common fields", () => {
    const values = {
      email_addresses: [{ email_address: "hello@acme.com" }],
      domains: [{ domain: "acme.com" }],
    };

    expect(getRecordSubtitle(values)).toBe("hello@acme.com");
  });

  it("prefers string values for subtitles", () => {
    const values = {
      description: [{ value: "Enterprise customer" }],
    };

    expect(getRecordSubtitle(values)).toBe("Enterprise customer");
  });
});
