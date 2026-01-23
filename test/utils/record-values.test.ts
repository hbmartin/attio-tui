import { describe, expect, it } from "vitest";
import type { RecordValue, RecordValues } from "../../source/types/attio.js";
import {
  getRecordSubtitle,
  getRecordTitle,
} from "../../source/utils/record-values.js";

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

function checkboxValue(value: boolean): RecordValue {
  return {
    ...baseValue,
    attribute_type: "checkbox",
    value,
  };
}

function emailValue(email: string): RecordValue {
  const [local, domain] = email.split("@");
  return {
    ...baseValue,
    attribute_type: "email-address",
    original_email_address: email,
    email_address: email,
    email_domain: domain ?? "",
    email_root_domain: domain ?? "",
    email_local_specifier: local ?? "",
  };
}

function domainValue(domain: string): RecordValue {
  return {
    ...baseValue,
    attribute_type: "domain",
    domain,
    root_domain: domain,
  };
}

describe("record helpers", () => {
  it("extracts a record title from common fields", () => {
    const values: RecordValues = {
      name: [textValue("Acme Corp")],
      title: [textValue("Ignored")],
    };

    expect(getRecordTitle(values)).toBe("Acme Corp");
  });

  it("falls back to Unnamed when no title is present", () => {
    const values: RecordValues = {
      status: [checkboxValue(true)],
    };

    expect(getRecordTitle(values)).toBe("Unnamed");
  });

  it("extracts a record subtitle from common fields", () => {
    const values: RecordValues = {
      email_addresses: [emailValue("hello@acme.com")],
      domains: [domainValue("acme.com")],
    };

    expect(getRecordSubtitle(values)).toBe("hello@acme.com");
  });

  it("prefers string values for subtitles", () => {
    const values: RecordValues = {
      description: [textValue("Enterprise customer")],
    };

    expect(getRecordSubtitle(values)).toBe("Enterprise customer");
  });
});
