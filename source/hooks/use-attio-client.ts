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

export function useAttioClient({
  config,
}: UseAttioClientOptions): UseAttioClientResult {
  const client = useMemo(() => {
    if (!config.apiKey) {
      return;
    }

    return createAttioClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
    });
  }, [config.apiKey, config.baseUrl]);

  return {
    client,
    isConfigured: Boolean(config.apiKey),
  };
}

// Create client directly for non-hook contexts
export function createClient(config: AppConfig): AttioClient | undefined {
  if (!config.apiKey) {
    return;
  }

  return createAttioClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });
}
