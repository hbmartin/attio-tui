import type { RecordInfo, RecordValue, RecordValues } from "../types/attio.js";

const TITLE_ATTRIBUTES: readonly string[] = [
  "name",
  "full_name",
  "title",
  "first_name",
  "company_name",
];

const SUBTITLE_ATTRIBUTES: readonly string[] = [
  "email_addresses",
  "domains",
  "description",
  "job_title",
];

function getFirstRecordValue(
  values: RecordValues,
  field: string,
): RecordValue | undefined {
  const fieldValues = values[field];
  if (!fieldValues || fieldValues.length === 0) {
    return;
  }
  return fieldValues[0];
}

function extractTextValue(value: RecordValue): string | undefined {
  if ("value" in value && typeof value.value === "string") {
    return value.value;
  }

  if ("full_name" in value && typeof value.full_name === "string") {
    return value.full_name;
  }

  if ("first_name" in value || "last_name" in value) {
    const firstName = "first_name" in value ? value.first_name : undefined;
    const lastName = "last_name" in value ? value.last_name : undefined;
    const name = [firstName, lastName].filter(Boolean).join(" ");
    return name || undefined;
  }

  if ("email_address" in value && typeof value.email_address === "string") {
    return value.email_address;
  }

  if ("domain" in value && typeof value.domain === "string") {
    return value.domain;
  }

  if ("option" in value) {
    return value.option.title || undefined;
  }

  if ("status" in value) {
    return value.status.title || undefined;
  }

  return;
}

// Helper to extract display name from record values
export function getRecordTitle(values: RecordValues): string {
  for (const attribute of TITLE_ATTRIBUTES) {
    const firstValue = getFirstRecordValue(values, attribute);
    const title = firstValue ? extractTextValue(firstValue) : undefined;
    if (title) {
      return title;
    }
  }

  return "Unnamed";
}

// Helper to extract display name from a record
export function getRecordDisplayName(record: RecordInfo): string {
  const title = getRecordTitle(record.values);
  return title === "Unnamed" ? record.id : title;
}

// Helper to extract subtitle from record values
export function getRecordSubtitle(values: RecordValues): string {
  for (const attribute of SUBTITLE_ATTRIBUTES) {
    const firstValue = getFirstRecordValue(values, attribute);
    const subtitle = firstValue ? extractTextValue(firstValue) : undefined;
    if (subtitle) {
      return subtitle;
    }
  }

  return "";
}
