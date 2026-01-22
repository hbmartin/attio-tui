import { describe, expect, it } from "vitest";
import {
  AppConfigSchema,
  DEFAULT_CONFIG,
  isValidApiKey,
  parseConfig,
} from "./config-schema.js";

describe("AppConfigSchema", () => {
  it("should parse valid config with all fields", () => {
    const input = {
      apiKey: "test-api-key-12345678901234567890",
      baseUrl: "https://api.attio.com",
      debugEnabled: true,
    };

    const result = AppConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.apiKey).toBe(input.apiKey);
      expect(result.data.baseUrl).toBe(input.baseUrl);
      expect(result.data.debugEnabled).toBe(true);
    }
  });

  it("should parse config with only apiKey", () => {
    const input = {
      apiKey: "test-api-key-12345678901234567890",
    };

    const result = AppConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.apiKey).toBe(input.apiKey);
      expect(result.data.baseUrl).toBe("https://api.attio.com");
      expect(result.data.debugEnabled).toBe(false);
    }
  });

  it("should parse empty config with defaults", () => {
    const result = AppConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.apiKey).toBeUndefined();
      expect(result.data.baseUrl).toBe("https://api.attio.com");
      expect(result.data.debugEnabled).toBe(false);
    }
  });

  it("should reject invalid baseUrl", () => {
    const input = {
      apiKey: "test-api-key-12345678901234567890",
      baseUrl: "not-a-url",
    };

    const result = AppConfigSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject empty apiKey", () => {
    const input = {
      apiKey: "",
    };

    const result = AppConfigSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("parseConfig", () => {
  it("should parse valid config", () => {
    const input = {
      apiKey: "test-api-key-12345678901234567890",
      baseUrl: "https://custom.api.com",
    };

    const result = parseConfig(input);
    expect(result.apiKey).toBe(input.apiKey);
    expect(result.baseUrl).toBe(input.baseUrl);
  });

  it("should return defaults for invalid input", () => {
    const result = parseConfig("invalid");
    expect(result).toEqual(DEFAULT_CONFIG);
  });

  it("should return defaults for null input", () => {
    const result = parseConfig(null);
    expect(result).toEqual(DEFAULT_CONFIG);
  });

  it("should return defaults for undefined input", () => {
    const result = parseConfig(undefined);
    expect(result).toEqual(DEFAULT_CONFIG);
  });
});

describe("isValidApiKey", () => {
  // Valid Attio key: "at_" prefix + 48 hex characters (total 51 chars)
  interface ApiKeyTestData {
    validKey: string;
    missingPrefixKey: string;
    wrongPrefixKey: string;
    shortKey: string;
    nonHexKey: string;
    uppercaseHexKey: string;
    specialCharKey: string;
  }

  const hexChunk = "0123456789abcdef";

  const buildHex = (length: number): string => {
    const repeated = hexChunk.repeat(Math.ceil(length / hexChunk.length));
    return repeated.slice(0, length);
  };

  const apiKeyTestData: ApiKeyTestData = {
    validKey: `at_${buildHex(48)}`,
    missingPrefixKey: buildHex(48),
    wrongPrefixKey: `sk_${buildHex(48)}`,
    shortKey: `at_${buildHex(8)}`,
    nonHexKey: `at_${buildHex(47)}g`,
    uppercaseHexKey: `at_${buildHex(47)}A`,
    specialCharKey: `at_${["abc", "@", "def", "#", "ghi", "$", "123", "!", "456"].join("")}`,
  };

  it("should accept valid Attio API key with at_ prefix and hex chars", () => {
    expect(isValidApiKey(apiKeyTestData.validKey)).toBe(true);
  });

  it("should accept longer API keys", () => {
    expect(isValidApiKey(`${apiKeyTestData.validKey}00`)).toBe(true);
  });

  it("should reject key without at_ prefix", () => {
    expect(isValidApiKey(apiKeyTestData.missingPrefixKey)).toBe(false);
  });

  it("should reject key with wrong prefix", () => {
    expect(isValidApiKey(apiKeyTestData.wrongPrefixKey)).toBe(false);
  });

  it("should reject short API key", () => {
    expect(isValidApiKey(apiKeyTestData.shortKey)).toBe(false);
  });

  it("should reject key with non-hex characters after prefix", () => {
    expect(isValidApiKey(apiKeyTestData.nonHexKey)).toBe(false);
  });

  it("should reject key with uppercase hex characters", () => {
    expect(isValidApiKey(apiKeyTestData.uppercaseHexKey)).toBe(false);
  });

  it("should reject API key with special characters", () => {
    expect(isValidApiKey(apiKeyTestData.specialCharKey)).toBe(false);
  });

  it("should reject empty API key", () => {
    expect(isValidApiKey("")).toBe(false);
  });
});

describe("DEFAULT_CONFIG", () => {
  it("should have correct default values", () => {
    expect(DEFAULT_CONFIG.apiKey).toBeUndefined();
    expect(DEFAULT_CONFIG.baseUrl).toBe("https://api.attio.com");
    expect(DEFAULT_CONFIG.debugEnabled).toBe(false);
  });
});
