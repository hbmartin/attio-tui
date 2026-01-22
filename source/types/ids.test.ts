import { describe, expect, it } from "vitest";
import {
  ObjectIdSchema,
  ObjectSlugSchema,
  parseObjectId,
  parseObjectSlug,
  parseRecordId,
  RecordIdSchema,
} from "./ids.js";

describe("branded ID schemas", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  const invalidUuid = "not-a-uuid";

  describe("ObjectIdSchema", () => {
    it("should parse valid UUID", () => {
      const result = ObjectIdSchema.safeParse(validUuid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(validUuid);
      }
    });

    it("should reject invalid UUID", () => {
      const result = ObjectIdSchema.safeParse(invalidUuid);
      expect(result.success).toBe(false);
    });
  });

  describe("ObjectSlugSchema", () => {
    it("should parse valid slug", () => {
      const result = ObjectSlugSchema.safeParse("companies");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("companies");
      }
    });

    it("should reject empty string", () => {
      const result = ObjectSlugSchema.safeParse("");
      expect(result.success).toBe(false);
    });
  });

  describe("RecordIdSchema", () => {
    it("should parse valid UUID", () => {
      const result = RecordIdSchema.safeParse(validUuid);
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const result = RecordIdSchema.safeParse(invalidUuid);
      expect(result.success).toBe(false);
    });
  });
});

describe("parse helpers", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  describe("parseObjectId", () => {
    it("should return branded ObjectId", () => {
      const result = parseObjectId(validUuid);
      expect(result).toBe(validUuid);
    });

    it("should throw for invalid UUID", () => {
      expect(() => parseObjectId("invalid")).toThrow();
    });
  });

  describe("parseObjectSlug", () => {
    it("should return branded ObjectSlug", () => {
      const result = parseObjectSlug("companies");
      expect(result).toBe("companies");
    });

    it("should throw for empty string", () => {
      expect(() => parseObjectSlug("")).toThrow();
    });
  });

  describe("parseRecordId", () => {
    it("should return branded RecordId", () => {
      const result = parseRecordId(validUuid);
      expect(result).toBe(validUuid);
    });

    it("should throw for invalid UUID", () => {
      expect(() => parseRecordId("invalid")).toThrow();
    });
  });
});
