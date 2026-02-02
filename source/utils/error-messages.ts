import { AttioError } from "attio-ts-sdk";

/**
 * Returns a debug-friendly string representation of an error.
 * Prefers stack trace, falls back to message, then string coercion.
 */
export function errorToDebugString(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}

interface ErrorInfo {
  readonly message: string;
  readonly status?: number;
  readonly code?: string;
  readonly isNetworkError?: boolean;
  readonly isRateLimited?: boolean;
}

/**
 * Extracts the root cause from an error chain.
 * Traverses the `cause` property to find the deepest error.
 */
function getRootCause(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return error;
  }

  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current instanceof Error && current.cause && !seen.has(current)) {
    seen.add(current);
    current = current.cause;
  }

  return current;
}

/**
 * Checks if a value is a non-null object (for duck-typing property access).
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Extracts structured information from an error, including SDK-specific details.
 * Uses duck-typing to extract fields from error-like objects that may not be
 * instanceof AttioError (e.g., root causes from cause chains, serialized errors).
 */
function extractErrorInfo(error: unknown): ErrorInfo {
  if (!(error instanceof Error)) {
    // Handle non-Error objects that might have error-like properties
    if (isRecord(error)) {
      const message =
        typeof error["message"] === "string" ? error["message"] : String(error);
      const status =
        typeof error["status"] === "number" ? error["status"] : undefined;
      const code =
        typeof error["code"] === "string" ? error["code"] : undefined;
      const isNetworkError =
        typeof error["isNetworkError"] === "boolean"
          ? error["isNetworkError"]
          : undefined;
      return {
        message,
        status,
        code,
        isNetworkError,
        isRateLimited: status === 429,
      };
    }
    return {
      message: String(error),
      status: undefined,
      code: undefined,
      isNetworkError: undefined,
      isRateLimited: undefined,
    };
  }

  // For AttioError instances, access properties directly
  if (error instanceof AttioError) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
      isNetworkError: error.isNetworkError,
      isRateLimited: error.status === 429,
    };
  }

  // For other Error instances, duck-type the SDK-specific properties
  // This handles cases where errors have these properties but aren't AttioError instances
  const status =
    "status" in error && typeof error.status === "number"
      ? error.status
      : undefined;
  const code =
    "code" in error && typeof error.code === "string" ? error.code : undefined;
  const isNetworkError =
    "isNetworkError" in error && typeof error.isNetworkError === "boolean"
      ? error.isNetworkError
      : undefined;

  return {
    message: error.message,
    status,
    code,
    isNetworkError,
    isRateLimited: status === 429,
  };
}

/**
 * Formats an HTTP status code into a human-readable description.
 */
function formatStatusDescription(status: number): string {
  const descriptions: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    429: "Rate Limited",
    500: "Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return descriptions[status] ?? `HTTP ${status}`;
}

/**
 * Extracts a user-friendly error message from any error, with special handling
 * for Attio SDK errors including retry exhaustion and cause chains.
 *
 * @param error - The error to extract a message from
 * @returns A descriptive error message suitable for display to users
 */
export function extractErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error) || "Unknown error";
  }

  const topInfo = extractErrorInfo(error);
  const rootCause = getRootCause(error);
  const rootInfo =
    rootCause !== error ? extractErrorInfo(rootCause) : undefined;

  // If this is a retry exhaustion error, focus on the underlying cause
  if (topInfo.code === "RETRY_EXHAUSTED") {
    // No cause information available
    if (!rootInfo) {
      return "API request failed after retries";
    }

    const parts: string[] = [];

    if (rootInfo.isRateLimited) {
      parts.push("Rate limited by Attio API");
    } else if (rootInfo.isNetworkError) {
      parts.push("Network error");
    } else if (rootInfo.status) {
      parts.push(formatStatusDescription(rootInfo.status));
    }

    if (rootInfo.message && rootInfo.message !== topInfo.message) {
      // Clean up common verbose messages
      const cleanMessage = rootInfo.message
        .replace(/^(Error: )+/, "")
        .replace(/\s*\(after \d+ retries?\)$/i, "");
      if (cleanMessage && !parts.some((p) => cleanMessage.includes(p))) {
        parts.push(cleanMessage);
      }
    }

    if (parts.length > 0) {
      return `${parts.join(": ")} (retries exhausted)`;
    }
    return "API request failed after retries";
  }

  // For other Attio errors, include status context
  if (topInfo.status) {
    const statusDesc = formatStatusDescription(topInfo.status);
    if (!topInfo.message.includes(String(topInfo.status))) {
      return `${statusDesc}: ${topInfo.message}`;
    }
  }

  if (topInfo.isNetworkError) {
    return `Network error: ${topInfo.message}`;
  }

  return topInfo.message || "Unknown error";
}
