import type { AttioClient } from "attio-ts-sdk";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useAttioClient } from "../hooks/use-attio-client.js";
import { useConfig } from "../hooks/use-config.js";
import type { AppConfig } from "../schemas/config-schema.js";

interface ClientContextValue {
  readonly client: AttioClient | undefined;
  readonly isConfigured: boolean;
  readonly config: AppConfig;
  readonly configLoading: boolean;
  readonly configError: string | undefined;
  readonly setApiKey: (apiKey: string) => void;
}

const ClientContext = createContext<ClientContextValue | undefined>(undefined);

interface ClientProviderProps {
  readonly children: ReactNode;
}

export function ClientProvider({ children }: ClientProviderProps) {
  const {
    config,
    loading: configLoading,
    error: configError,
    setApiKey,
  } = useConfig();

  const { client, isConfigured } = useAttioClient({ config });

  const value = useMemo(
    () => ({
      client,
      isConfigured,
      config,
      configLoading,
      configError,
      setApiKey,
    }),
    [client, isConfigured, config, configLoading, configError, setApiKey],
  );

  return (
    <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
  );
}

export function useClient(): ClientContextValue {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context;
}

export function useAttio(): AttioClient | undefined {
  const { client } = useClient();
  return client;
}

export function useIsConfigured(): boolean {
  const { isConfigured } = useClient();
  return isConfigured;
}
