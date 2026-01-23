import { describe, expect, it } from "vitest";
import {
  buildOffsetPaginationRequest,
  finalizeOffsetPagination,
  parseCursorOffset,
  resolveOffsetPagination,
} from "../../source/utils/pagination.js";

describe("parseCursorOffset", () => {
  it("returns undefined for undefined input", () => {
    expect(parseCursorOffset(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(parseCursorOffset("")).toBeUndefined();
  });

  it("parses valid numeric string", () => {
    expect(parseCursorOffset("0")).toBe(0);
    expect(parseCursorOffset("10")).toBe(10);
    expect(parseCursorOffset("100")).toBe(100);
    expect(parseCursorOffset("25")).toBe(25);
  });

  it("returns undefined for negative numbers", () => {
    expect(parseCursorOffset("-1")).toBeUndefined();
    expect(parseCursorOffset("-100")).toBeUndefined();
  });

  it("returns undefined for non-numeric strings", () => {
    expect(parseCursorOffset("abc")).toBeUndefined();
    expect(parseCursorOffset("invalid")).toBeUndefined();
    expect(parseCursorOffset("null")).toBeUndefined();
    expect(parseCursorOffset("undefined")).toBeUndefined();
  });

  it("returns undefined for floating point strings", () => {
    expect(parseCursorOffset("10.5")).toBe(10);
    expect(parseCursorOffset("25.9")).toBe(25);
  });

  it("returns undefined for strings with leading/trailing text", () => {
    expect(parseCursorOffset("10abc")).toBe(10);
    expect(parseCursorOffset("abc10")).toBeUndefined();
  });

  it("handles whitespace in string", () => {
    expect(parseCursorOffset(" 10")).toBe(10);
    expect(parseCursorOffset("10 ")).toBe(10);
    expect(parseCursorOffset(" 10 ")).toBe(10);
  });

  it("returns undefined for NaN-producing inputs", () => {
    expect(parseCursorOffset("NaN")).toBeUndefined();
    expect(parseCursorOffset("Infinity")).toBeUndefined();
  });
});

describe("buildOffsetPaginationRequest", () => {
  it("uses default limit and cursor offset", () => {
    const result = buildOffsetPaginationRequest({ cursor: "5" });
    expect(result.limit).toBe(25);
    expect(result.offset).toBe(5);
    expect(result.requestLimit).toBe(26);
  });

  it("clamps invalid limits to default", () => {
    const zeroLimit = buildOffsetPaginationRequest({ limit: 0 });
    expect(zeroLimit.limit).toBe(25);
    expect(zeroLimit.requestLimit).toBe(26);

    const negativeLimit = buildOffsetPaginationRequest({ limit: -3 });
    expect(negativeLimit.limit).toBe(1);
    expect(negativeLimit.requestLimit).toBe(2);
  });

  it("supports overriding the default limit", () => {
    const result = buildOffsetPaginationRequest({
      limit: 0,
      defaultLimit: 10,
    });
    expect(result.limit).toBe(10);
    expect(result.requestLimit).toBe(11);
  });
});

describe("finalizeOffsetPagination", () => {
  it("trims items and computes next cursor when more data exists", () => {
    const result = finalizeOffsetPagination({
      data: ["a", "b", "c"],
      limit: 2,
      offset: 4,
    });
    expect(result.items).toEqual(["a", "b"]);
    expect(result.nextCursor).toBe("6");
  });

  it("returns all items when no more data exists", () => {
    const result = finalizeOffsetPagination({
      data: ["a", "b"],
      limit: 2,
      offset: undefined,
    });
    expect(result.items).toEqual(["a", "b"]);
    expect(result.nextCursor).toBeNull();
  });
});

describe("resolveOffsetPagination", () => {
  it("throws with a formatted message when an error is present", () => {
    expect(() =>
      resolveOffsetPagination({
        error: { message: "boom" },
        data: [],
        pagination: {
          limit: 1,
          offset: 0,
          requestLimit: 2,
        },
        errorMessage: "Failed to fetch things",
      }),
    ).toThrow("Failed to fetch things");
  });

  it("returns paginated data when no error is present", () => {
    const result = resolveOffsetPagination({
      error: undefined,
      data: ["x", "y", "z"],
      pagination: {
        limit: 2,
        offset: 2,
        requestLimit: 3,
      },
      errorMessage: "Failed to fetch things",
    });
    expect(result.items).toEqual(["x", "y"]);
    expect(result.nextCursor).toBe("4");
  });
});
