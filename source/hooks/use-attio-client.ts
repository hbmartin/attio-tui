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

interface AttioClientConfigInput {
  readonly apiKey: AppConfig["apiKey"];
  readonly baseUrl: AppConfig["baseUrl"];
}

/**
 * Builds an AttioClient from config if apiKey is present.
 * Shared helper for both hook and non-hook contexts.
 */
export function buildAttioClientFromConfig(
  config: AttioClientConfigInput,
): AttioClient | undefined {
  const { apiKey, baseUrl } = config;
  if (!apiKey) {
    return;
  }

  return createAttioClient({
    apiKey,
    baseUrl,
  });
}

export function useAttioClient({
  config,
}: UseAttioClientOptions): UseAttioClientResult {
  const { apiKey, baseUrl } = config;
  const client = useMemo(
    () => buildAttioClientFromConfig({ apiKey, baseUrl }),
    [apiKey, baseUrl],
  );

  return {
    client,
    isConfigured: Boolean(apiKey),
  };
}

// Create client directly for non-hook contexts
export function createClient(config: AppConfig): AttioClient | undefined {
  return buildAttioClientFromConfig({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });
}
