import type { AttioClient } from "attio-ts-sdk";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useAttioClient } from "../hooks/use-attio-client.js";
import { useConfig } from "../hooks/use-config.js";
import type { AppConfig } from "../schemas/config-schema.js";

export type ConfigState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly error: string }
  | {
      readonly status: "ready";
      readonly config: AppConfig;
      readonly isConfigured: boolean;
    };

interface ClientContextValue {
  readonly client: AttioClient | undefined;
  readonly configState: ConfigState;
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

  const configState: ConfigState = useMemo(() => {
    if (configLoading) {
      return { status: "loading" };
    }
    if (configError) {
      return { status: "error", error: configError };
    }
    return { status: "ready", config, isConfigured };
  }, [configLoading, configError, config, isConfigured]);

  const value = useMemo(
    () => ({
      client,
      configState,
      setApiKey,
    }),
    [client, configState, setApiKey],
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
  const { configState } = useClient();
  return configState.status === "ready" && configState.isConfigured;
}
