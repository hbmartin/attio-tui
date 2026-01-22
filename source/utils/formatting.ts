// Format various Attio value types for display

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.map((v) => formatValue(v)).join(", ");
  }

  if (typeof value === "object") {
    return formatObjectValue(value as Record<string, unknown>);
  }

  return String(value);
}

function formatObjectValue(obj: Record<string, unknown>): string {
  // Text, number, boolean values
  if ("value" in obj) {
    return formatValue(obj["value"]);
  }

  // Email
  if ("email_address" in obj) {
    return String(obj["email_address"]);
  }

  // Phone
  if ("phone_number" in obj) {
    return String(obj["phone_number"]);
  }

  // Domain
  if ("domain" in obj) {
    return String(obj["domain"]);
  }

  // Currency
  if ("currency_value" in obj) {
    const amount = obj["currency_value"] as number;
    const code = obj["currency_code"] as string | undefined;
    return code
      ? `${code} ${amount.toLocaleString()}`
      : amount.toLocaleString();
  }

  // Select option
  if ("option" in obj) {
    const option = obj["option"] as { title?: string };
    return option.title ?? "-";
  }

  // Status
  if ("status" in obj) {
    const status = obj["status"] as { title?: string };
    return status.title ?? "-";
  }

  // Person reference
  if ("person" in obj) {
    const person = obj["person"] as {
      first_name?: string;
      last_name?: string;
      email_address?: string;
    };
    const name = [person.first_name, person.last_name]
      .filter(Boolean)
      .join(" ");
    return name || person.email_address || "-";
  }

  // Record reference
  if ("target_object" in obj && "target_record_id" in obj) {
    return `${obj["target_object"]}/${obj["target_record_id"]}`;
  }

  // Location
  if ("line_1" in obj || "city" in obj || "country_code" in obj) {
    const parts = [
      obj["line_1"],
      obj["line_2"],
      obj["city"],
      obj["state"],
      obj["postcode"],
      obj["country_code"],
    ].filter(Boolean);
    return parts.join(", ") || "-";
  }

  // Fallback to JSON
  return JSON.stringify(obj);
}

// Format a date string for display
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString();
}

// Format a datetime string for display
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString();
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

// Truncate a string to a maximum length
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.slice(0, maxLength - 3)}...`;
}
