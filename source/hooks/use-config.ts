import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import fs from "node:fs/promises";
import process from "node:process";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AppConfig,
  DEFAULT_CONFIG,
  parseConfig,
} from "../schemas/config-schema.js";
import { getConfigDir, getConfigPath } from "../utils/config-path.js";
import { PtyDebug } from "../utils/pty-debug.js";

interface UseConfigResult {
  readonly config: AppConfig;
  readonly loading: boolean;
  readonly error: string | undefined;
  readonly saveConfig: (config: Partial<AppConfig>) => void;
  readonly setApiKey: (apiKey: string) => void;
}

// Ensure config directory exists (async)
async function ensureConfigDirAsync(): Promise<void> {
  const dir = getConfigDir();
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Ensure config directory exists (sync - for CLI initialization)
function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Load config from disk (async)
async function loadConfigFromDiskAsync(): Promise<AppConfig> {
  const configPath = getConfigPath();
  try {
    await fs.access(configPath);
  } catch {
    PtyDebug.log(`config path=${configPath} exists=false`);
    return DEFAULT_CONFIG;
  }

  PtyDebug.log(`config path=${configPath} exists=true`);
  const content = await fs.readFile(configPath, "utf-8");
  PtyDebug.log(`config read bytes=${content.length}`);
  const parsed: unknown = JSON.parse(content);
  return parseConfig(parsed);
}

// Load config from disk (sync - for CLI initialization)
function loadConfigFromDisk(): AppConfig {
  const configPath = getConfigPath();
  const exists = existsSync(configPath);
  PtyDebug.log(`config path=${configPath} exists=${String(exists)}`);
  if (!exists) {
    return DEFAULT_CONFIG;
  }

  const content = readFileSync(configPath, "utf-8");
  PtyDebug.log(`config read bytes=${content.length}`);
  const parsed: unknown = JSON.parse(content);
  return parseConfig(parsed);
}

// Save config to disk (async)
async function saveConfigToDiskAsync(config: AppConfig): Promise<void> {
  await ensureConfigDirAsync();
  const configPath = getConfigPath();
  await fs.writeFile(configPath, JSON.stringify(config, undefined, 2));
}

// Save config to disk (sync - for CLI initialization)
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
  const saveInFlightRef = useRef<Promise<void> | null>(null);

  // Load config on mount (async)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(undefined);

      try {
        const loadedConfig = await loadConfigFromDiskAsync();
        if (cancelled) {
          return;
        }
        latestConfigRef.current = loadedConfig;
        setConfig(loadedConfig);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        PtyDebug.log(`config load error: ${message}`);
        setError(`Failed to load config: ${message}`);
        latestConfigRef.current = DEFAULT_CONFIG;
        setConfig(DEFAULT_CONFIG);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load().catch(() => {
      // Error is already handled in load()
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Save config updates (async, but non-blocking to caller)
  const saveConfig = useCallback((updates: Partial<AppConfig>) => {
    const newConfig = { ...latestConfigRef.current, ...updates };
    latestConfigRef.current = newConfig;
    setConfig(() => newConfig);

    // Chain saves to prevent race conditions
    const prevSave = saveInFlightRef.current ?? Promise.resolve();
    saveInFlightRef.current = prevSave
      .then(() => saveConfigToDiskAsync(newConfig))
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        PtyDebug.log(`config save error: ${message}`);
        setError(`Failed to save config: ${message}`);
      });
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
