import { z } from "zod";

// Column configuration for a specific entity type
export const ColumnConfigSchema = z.object({
  attribute: z.string().min(1),
  width: z.number().int().positive().optional(),
  label: z.string().optional(),
});

export type ColumnConfig = z.infer<typeof ColumnConfigSchema>;

// Columns configuration per entity type
export const ColumnsConfigSchema = z.record(
  z.string(),
  z.array(ColumnConfigSchema),
);

export type ColumnsConfig = z.infer<typeof ColumnsConfigSchema>;

// Main application configuration schema
export const AppConfigSchema = z.object({
  apiKey: z.string().min(1).optional(),
  baseUrl: z.string().url().default("https://api.attio.com"),
  debugEnabled: z.boolean().default(false),
  columns: ColumnsConfigSchema.optional(),
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

// Validate API key format (basic check)
export function isValidApiKey(key: string): boolean {
  // Attio API keys are typically long alphanumeric strings
  return key.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(key);
}
