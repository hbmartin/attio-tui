import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { useCallback, useEffect, useState } from "react";
import {
  type AppConfig,
  DEFAULT_CONFIG,
  parseConfig,
} from "../schemas/config-schema.js";
import { getConfigDir, getConfigPath } from "../utils/config-path.js";

interface UseConfigResult {
  readonly config: AppConfig;
  readonly loading: boolean;
  readonly error: string | undefined;
  readonly saveConfig: (config: Partial<AppConfig>) => void;
  readonly setApiKey: (apiKey: string) => void;
}

// Ensure config directory exists
function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Load config from disk
function loadConfigFromDisk(): AppConfig {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  const content = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(content) as unknown;
  return parseConfig(parsed);
}

// Save config to disk
function saveConfigToDisk(config: AppConfig): void {
  ensureConfigDir();
  const configPath = getConfigPath();
  writeFileSync(configPath, JSON.stringify(config, undefined, 2));
}

export function useConfig(): UseConfigResult {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  // Load config on mount
  useEffect(() => {
    setLoading(true);
    setError(undefined);

    try {
      const loadedConfig = loadConfigFromDisk();
      setConfig(loadedConfig);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to load config: ${message}`);
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save config updates
  const saveConfig = useCallback(
    (updates: Partial<AppConfig>) => {
      const newConfig = { ...config, ...updates };
      setConfig(newConfig);

      try {
        saveConfigToDisk(newConfig);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to save config: ${message}`);
      }
    },
    [config],
  );

  // Convenience method to set API key
  const setApiKey = useCallback(
    (apiKey: string) => {
      saveConfig({ apiKey });
    },
    [saveConfig],
  );

  return {
    config,
    loading,
    error,
    saveConfig,
    setApiKey,
  };
}

// Synchronous config loading for CLI initialization
export function loadConfig(): AppConfig {
  try {
    return loadConfigFromDisk();
  } catch {
    return DEFAULT_CONFIG;
  }
}

// Synchronous config saving
export function saveConfig(config: AppConfig): void {
  saveConfigToDisk(config);
}
