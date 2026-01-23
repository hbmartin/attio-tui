import { describe, expect, it } from "vitest";
import {
  AppConfigSchema,
  DEFAULT_CONFIG,
  isValidApiKey,
  parseConfig,
} from "../../source/schemas/config-schema.js";

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
  it("should accept any non-empty string", () => {
    expect(isValidApiKey("any-string")).toBe(true);
    expect(isValidApiKey("at_0123456789abcdef")).toBe(true);
    expect(isValidApiKey("sk_test_key")).toBe(true);
    expect(isValidApiKey("a")).toBe(true);
  });

  it("should reject empty string", () => {
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
