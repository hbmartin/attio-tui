import { type AttioClient, createAttioClient } from "attio-ts-sdk";
import { useMemo } from "react";
import type { AppConfig } from "../schemas/config-schema.js";

interface UseAttioClientOptions {
  readonly config: AppConfig;
}

interface UseAttioClientResult {
  readonly client: AttioClient | undefined;
  readonly isConfigured: boolean;
}

/**
 * Builds an AttioClient from config if apiKey is present.
 * Shared helper for both hook and non-hook contexts.
 */
export function buildAttioClientFromConfig(
  config: AppConfig,
): AttioClient | undefined {
  if (!config.apiKey) {
    return;
  }

  return createAttioClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });
}

export function useAttioClient({
  config,
}: UseAttioClientOptions): UseAttioClientResult {
  const { apiKey, baseUrl, debugEnabled } = config;
  const client = useMemo(
    () => buildAttioClientFromConfig({ apiKey, baseUrl, debugEnabled }),
    [apiKey, baseUrl, debugEnabled],
  );

  return {
    client,
    isConfigured: Boolean(config.apiKey),
  };
}

// Create client directly for non-hook contexts
export function createClient(config: AppConfig): AttioClient | undefined {
  return buildAttioClientFromConfig(config);
}
