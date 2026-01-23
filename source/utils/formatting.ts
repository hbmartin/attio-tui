import type { RecordValue } from "../types/attio.js";
import { extractPersonName } from "./record-values.js";

// Format various Attio value types for display
export function formatValue(value: RecordValue | RecordValue[]): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "-";
    }
    return value.map((item) => formatRecordValue(item)).join(", ");
  }

  return formatRecordValue(value);
}

function formatRecordValue(value: RecordValue): string {
  if ("currency_value" in value && typeof value.currency_value === "number") {
    const code = "currency_code" in value ? value.currency_code : undefined;
    return code
      ? `${code} ${value.currency_value.toLocaleString()}`
      : value.currency_value.toLocaleString();
  }

  if ("value" in value) {
    return formatPrimitive(value.value);
  }

  if ("email_address" in value && typeof value.email_address === "string") {
    return value.email_address;
  }

  if ("phone_number" in value && typeof value.phone_number === "string") {
    return value.phone_number;
  }

  if (
    "original_phone_number" in value &&
    typeof value.original_phone_number === "string"
  ) {
    return value.original_phone_number;
  }

  if ("domain" in value) {
    return value.domain;
  }

  if ("option" in value) {
    return value.option.title || "-";
  }

  if ("status" in value) {
    return value.status.title || "-";
  }

  const personName = extractPersonName(value);
  if (personName) {
    return personName;
  }

  if ("target_object" in value && "target_record_id" in value) {
    return `${value.target_object}/${value.target_record_id}`;
  }

  if ("line_1" in value || "city" in value || "country_code" in value) {
    const parts = [
      "line_1" in value ? value.line_1 : undefined,
      "line_2" in value ? value.line_2 : undefined,
      "city" in value ? value.city : undefined,
      "state" in value ? value.state : undefined,
      "postcode" in value ? value.postcode : undefined,
      "country_code" in value ? value.country_code : undefined,
    ].filter(Boolean);

    return parts.join(", ") || "-";
  }

  return JSON.stringify(value);
}

function formatPrimitive(value: string | number | boolean): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

// Parse a date string and format it, returning fallback for invalid dates
function formatDateWith(
  dateString: string | null | undefined,
  formatter: (date: Date) => string,
): string {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return formatter(date);
}

// Format a date string for display
export function formatDate(dateString: string | null | undefined): string {
  return formatDateWith(dateString, (date) => date.toLocaleDateString());
}

// Format a datetime string for display
export function formatDateTime(dateString: string | null | undefined): string {
  return formatDateWith(dateString, (date) => date.toLocaleString());
}

export interface FormatMeetingTimeOptions {
  readonly startAt: string;
  readonly endAt: string;
}

// Format a meeting time range with date and time
// Returns empty string if either date is invalid
// For same-day meetings: "DATE STARTTIME - ENDTIME"
// For cross-day meetings: "STARTDATE STARTTIME - ENDDATE ENDTIME"
export function formatMeetingTime({
  startAt,
  endAt,
}: FormatMeetingTimeOptions): string {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };

  const startDateStr = start.toLocaleDateString();
  const endDateStr = end.toLocaleDateString();
  const startTime = start.toLocaleTimeString([], timeOptions);
  const endTime = end.toLocaleTimeString([], timeOptions);

  const isSameDay = startDateStr === endDateStr;

  if (isSameDay) {
    return `${startDateStr} ${startTime} - ${endTime}`;
  }

  return `${startDateStr} ${startTime} - ${endDateStr} ${endTime}`;
}

// Format a relative time (e.g., "2 hours ago")
export function formatRelativeTime(
  dateString: string | null | undefined,
): string {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const now = new Date();
  if (date.getTime() > now.getTime()) {
    return formatDate(dateString);
  }
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return "just now";
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  if (diffDay < 7) {
    return `${diffDay}d ago`;
  }

  return formatDate(dateString);
}

export interface TaskSubtitleOptions {
  readonly isCompleted: boolean;
  readonly deadlineAt: string | null;
}

// Build a task subtitle based on completion and deadline
export function getTaskSubtitle({
  isCompleted,
  deadlineAt,
}: TaskSubtitleOptions): string {
  if (isCompleted) {
    return "Completed";
  }
  if (deadlineAt) {
    return `Due: ${formatDate(deadlineAt)}`;
  }
  return "No deadline";
}

// Truncate a string to a maximum length
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.slice(0, maxLength - 3)}...`;
}

// Backwards-compatible helper for truncating text
export function truncateText(text: string, maxLength: number): string {
  return truncate(text, maxLength);
}
