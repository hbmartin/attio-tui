import { z } from "zod";

// Main application configuration schema
export const AppConfigSchema = z.object({
  apiKey: z.string().min(1).optional(),
  baseUrl: z.string().url().default("https://api.attio.com"),
  debugEnabled: z.boolean().default(false),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

// Default configuration values
export const DEFAULT_CONFIG: AppConfig = {
  baseUrl: "https://api.attio.com",
  debugEnabled: false,
};

// Parse config with defaults
export function parseConfig(input: unknown): AppConfig {
  const result = AppConfigSchema.safeParse(input);
  if (result.success) {
    return result.data;
  }
  return DEFAULT_CONFIG;
}

// Validate API key format (strict Attio key format)
export function isValidApiKey(key: string): boolean {
  // Attio API keys must start with "at_" followed by hex characters only
  // Total length is at least 51 (3-char prefix + 48 hex chars)
  return key.length >= 51 && /^at_[0-9a-f]+$/.test(key);
}
