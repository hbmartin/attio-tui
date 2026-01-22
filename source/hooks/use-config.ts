import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const latestConfigRef = useRef<AppConfig>(DEFAULT_CONFIG);

  // Load config on mount
  useEffect(() => {
    setLoading(true);
    setError(undefined);

    try {
      const loadedConfig = loadConfigFromDisk();
      latestConfigRef.current = loadedConfig;
      setConfig(loadedConfig);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to load config: ${message}`);
      latestConfigRef.current = DEFAULT_CONFIG;
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    latestConfigRef.current = config;
  }, [config]);

  // Save config updates
  const saveConfig = useCallback((updates: Partial<AppConfig>) => {
    const newConfig = { ...latestConfigRef.current, ...updates };
    latestConfigRef.current = newConfig;
    setConfig(() => newConfig);
    try {
      saveConfigToDisk(newConfig);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save config: ${message}`);
    }
  }, []);

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
  try {
    saveConfigToDisk(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Log to stderr to avoid interfering with TUI rendering
    process.stderr.write(`Failed to save config: ${message}\n`);
  }
}
