import { describe, expect, it } from "vitest";
import { parseCursorOffset } from "./pagination.js";

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
