import type { AttioClient } from "attio-ts-sdk";
import { useCallback, useState } from "react";
import {
  createWebhook,
  deleteWebhook,
  updateWebhook,
} from "../services/webhooks-service.js";
import type { AppAction } from "../state/app-state.js";
import type { WebhookEventType } from "../types/attio.js";
import type { DebugRequestLogEntryInput } from "../types/debug.js";

interface UseWebhookOperationsOptions {
  readonly client: AttioClient | undefined;
  readonly dispatch: React.Dispatch<AppAction>;
  readonly onSuccess?: () => void;
  readonly onRequestLog?: (entry: DebugRequestLogEntryInput) => void;
}

interface WebhookOperationsState {
  readonly isSubmitting: boolean;
  readonly error: string | undefined;
}

interface SubmitWebhookOperationParams {
  readonly operation: (client: AttioClient) => Promise<unknown>;
  readonly fallbackError: string;
  readonly label: string;
}

interface UpdateWebhookParams {
  readonly webhookId: string;
  readonly targetUrl: string;
  readonly selectedEvents: readonly WebhookEventType[];
}

export function useWebhookOperations({
  client,
  dispatch,
  onSuccess,
  onRequestLog,
}: UseWebhookOperationsOptions) {
  const [state, setState] = useState<WebhookOperationsState>({
    isSubmitting: false,
    error: undefined,
  });

  const logRequestSafely = useCallback(
    (entry: DebugRequestLogEntryInput): void => {
      if (!onRequestLog) {
        return;
      }

      try {
        onRequestLog(entry);
      } catch {
        return;
      }
    },
    [onRequestLog],
  );

  const submitOperation = useCallback(
    async ({
      operation,
      fallbackError,
      label,
    }: SubmitWebhookOperationParams) => {
      if (!client) {
        setState({ isSubmitting: false, error: "No client available" });
        return;
      }

      setState({ isSubmitting: true, error: undefined });
      const startTime = Date.now();
      const startedAt = new Date(startTime).toISOString();

      try {
        await operation(client);

        const durationMs = Date.now() - startTime;
        logRequestSafely({
          label,
          status: "success",
          startedAt,
          durationMs,
        });
        setState({ isSubmitting: false, error: undefined });
        dispatch({ type: "CLOSE_WEBHOOK_MODAL" });
        onSuccess?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : fallbackError;
        const durationMs = Date.now() - startTime;
        logRequestSafely({
          label,
          status: "error",
          startedAt,
          durationMs,
          errorMessage: message,
        });
        setState({ isSubmitting: false, error: message });
      }
    },
    [client, dispatch, logRequestSafely, onSuccess],
  );

  const handleCreate = useCallback(
    async (targetUrl: string, selectedEvents: readonly WebhookEventType[]) =>
      submitOperation({
        operation: (activeClient) =>
          createWebhook(activeClient, {
            targetUrl,
            subscriptions: selectedEvents.map((eventType) => ({ eventType })),
          }),
        fallbackError: "Failed to create webhook",
        label: "create webhook",
      }),
    [submitOperation],
  );

  const handleUpdate = useCallback(
    async ({ webhookId, targetUrl, selectedEvents }: UpdateWebhookParams) =>
      submitOperation({
        operation: (activeClient) =>
          updateWebhook(activeClient, webhookId, {
            targetUrl,
            subscriptions: selectedEvents.map((eventType) => ({ eventType })),
          }),
        fallbackError: "Failed to update webhook",
        label: "update webhook",
      }),
    [submitOperation],
  );

  const handleDelete = useCallback(
    async (webhookId: string) =>
      submitOperation({
        operation: (activeClient) => deleteWebhook(activeClient, webhookId),
        fallbackError: "Failed to delete webhook",
        label: "delete webhook",
      }),
    [submitOperation],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: undefined }));
  }, []);

  return {
    isSubmitting: state.isSubmitting,
    error: state.error,
    handleCreate,
    handleUpdate,
    handleDelete,
    clearError,
  };
}
