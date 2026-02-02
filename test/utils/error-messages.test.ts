import {
  AttioApiError,
  AttioError,
  AttioNetworkError,
  AttioRetryError,
} from "attio-ts-sdk";
import { describe, expect, it } from "vitest";
import { extractErrorMessage } from "../../source/utils/error-messages.js";

describe("extractErrorMessage", () => {
  describe("basic errors", () => {
    it("extracts message from standard Error", () => {
      const error = new Error("Something went wrong");
      expect(extractErrorMessage(error)).toBe("Something went wrong");
    });

    it("handles non-Error values", () => {
      expect(extractErrorMessage("string error")).toBe("string error");
      expect(extractErrorMessage(null)).toBe("null");
      expect(extractErrorMessage(undefined)).toBe("undefined");
      expect(extractErrorMessage(42)).toBe("42");
    });

    it("handles empty string error", () => {
      expect(extractErrorMessage("")).toBe("Unknown error");
    });
  });

  describe("AttioError handling", () => {
    it("includes status description for API errors with status", () => {
      const error = new AttioError("Request failed", { status: 401 });
      expect(extractErrorMessage(error)).toBe("Unauthorized: Request failed");
    });

    it("handles rate limited errors (429)", () => {
      const error = new AttioError("Too many requests", { status: 429 });
      expect(extractErrorMessage(error)).toBe(
        "Rate Limited: Too many requests",
      );
    });

    it("handles server errors (500)", () => {
      const error = new AttioError("Internal error", { status: 500 });
      expect(extractErrorMessage(error)).toBe("Server Error: Internal error");
    });

    it("handles network errors", () => {
      const error = new AttioNetworkError("Failed to fetch");
      expect(extractErrorMessage(error)).toBe("Network error: Failed to fetch");
    });

    it("skips duplicate status in message", () => {
      const error = new AttioError("401 Unauthorized", { status: 401 });
      // Should not double up the status
      expect(extractErrorMessage(error)).toBe("401 Unauthorized");
    });
  });

  describe("retry exhaustion with cause chain", () => {
    it("extracts root cause from retry exhausted error", () => {
      const rootCause = new AttioApiError("Invalid API key", { status: 401 });
      const retryError = new AttioRetryError("Retry attempts exhausted.", {
        code: "RETRY_EXHAUSTED",
        cause: rootCause,
      });

      expect(extractErrorMessage(retryError)).toBe(
        "Unauthorized: Invalid API key (retries exhausted)",
      );
    });

    it("handles rate limited root cause", () => {
      const rootCause = new AttioError("Rate limit exceeded", { status: 429 });
      const retryError = new AttioRetryError("Retry attempts exhausted.", {
        code: "RETRY_EXHAUSTED",
        cause: rootCause,
      });

      expect(extractErrorMessage(retryError)).toBe(
        "Rate limited by Attio API: Rate limit exceeded (retries exhausted)",
      );
    });

    it("handles network error root cause", () => {
      const rootCause = new AttioNetworkError("Connection refused");
      const retryError = new AttioRetryError("Retry attempts exhausted.", {
        code: "RETRY_EXHAUSTED",
        cause: rootCause,
      });

      expect(extractErrorMessage(retryError)).toBe(
        "Network error: Connection refused (retries exhausted)",
      );
    });

    it("handles server error root cause", () => {
      const rootCause = new AttioError("Service unavailable", { status: 503 });
      const retryError = new AttioRetryError("Retry attempts exhausted.", {
        code: "RETRY_EXHAUSTED",
        cause: rootCause,
      });

      expect(extractErrorMessage(retryError)).toBe(
        "Service Unavailable: Service unavailable (retries exhausted)",
      );
    });

    it("handles retry error without cause", () => {
      const retryError = new AttioRetryError("Retry attempts exhausted.", {
        code: "RETRY_EXHAUSTED",
      });

      expect(extractErrorMessage(retryError)).toBe(
        "API request failed after retries",
      );
    });

    it("handles deeply nested cause chain", () => {
      const rootCause = new AttioApiError("Forbidden", { status: 403 });
      const middleError = new Error("Wrapped error");
      middleError.cause = rootCause;
      const retryError = new AttioRetryError("Retry attempts exhausted.", {
        code: "RETRY_EXHAUSTED",
        cause: middleError,
      });

      expect(extractErrorMessage(retryError)).toBe(
        "Forbidden (retries exhausted)",
      );
    });
  });

  describe("edge cases", () => {
    it("handles circular cause reference", () => {
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");
      error1.cause = error2;
      error2.cause = error1;

      // Should not infinite loop
      expect(extractErrorMessage(error1)).toBe("Error 1");
    });

    it("handles unknown status codes", () => {
      const error = new AttioError("Strange error", { status: 418 });
      expect(extractErrorMessage(error)).toBe("HTTP 418: Strange error");
    });
  });

  describe("duck-typed error properties", () => {
    it("extracts status from Error with duck-typed status property", () => {
      const error = new Error("Request failed");
      (error as Error & { status: number }).status = 404;
      expect(extractErrorMessage(error)).toBe("Not Found: Request failed");
    });

    it("extracts isNetworkError from Error with duck-typed property", () => {
      const error = new Error("Connection failed");
      (error as Error & { isNetworkError: boolean }).isNetworkError = true;
      expect(extractErrorMessage(error)).toBe(
        "Network error: Connection failed",
      );
    });

    it("handles retry error with duck-typed root cause", () => {
      // Simulate a root cause that has AttioError-like properties but isn't instanceof AttioError
      const rootCause = new Error("Service unavailable");
      (rootCause as Error & { status: number }).status = 503;

      const retryError = new AttioRetryError("Retry attempts exhausted.", {
        code: "RETRY_EXHAUSTED",
        cause: rootCause,
      });

      expect(extractErrorMessage(retryError)).toBe(
        "Service Unavailable: Service unavailable (retries exhausted)",
      );
    });

    it("handles retry error with duck-typed network error root cause", () => {
      const rootCause = new Error("ECONNREFUSED");
      (rootCause as Error & { isNetworkError: boolean }).isNetworkError = true;

      const retryError = new AttioRetryError("Retry attempts exhausted.", {
        code: "RETRY_EXHAUSTED",
        cause: rootCause,
      });

      expect(extractErrorMessage(retryError)).toBe(
        "Network error: ECONNREFUSED (retries exhausted)",
      );
    });

    it("handles retry error with duck-typed rate limit root cause", () => {
      const rootCause = new Error("Rate limit exceeded");
      (rootCause as Error & { status: number }).status = 429;

      const retryError = new AttioRetryError("Retry attempts exhausted.", {
        code: "RETRY_EXHAUSTED",
        cause: rootCause,
      });

      expect(extractErrorMessage(retryError)).toBe(
        "Rate limited by Attio API: Rate limit exceeded (retries exhausted)",
      );
    });
  });
});
