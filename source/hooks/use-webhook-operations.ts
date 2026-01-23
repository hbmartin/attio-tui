import type { AttioClient } from "attio-ts-sdk";
import { useCallback, useState } from "react";
import {
  createWebhook,
  deleteWebhook,
  updateWebhook,
} from "../services/webhooks-service.js";
import type { AppAction } from "../state/app-state.js";
import type { WebhookEventType } from "../types/attio.js";

interface UseWebhookOperationsOptions {
  readonly client: AttioClient | undefined;
  readonly dispatch: React.Dispatch<AppAction>;
  readonly onSuccess?: () => void;
}

interface WebhookOperationsState {
  readonly isSubmitting: boolean;
  readonly error: string | undefined;
}

interface SubmitWebhookOperationParams {
  readonly operation: (client: AttioClient) => Promise<unknown>;
  readonly fallbackError: string;
}

export function useWebhookOperations({
  client,
  dispatch,
  onSuccess,
}: UseWebhookOperationsOptions) {
  const [state, setState] = useState<WebhookOperationsState>({
    isSubmitting: false,
    error: undefined,
  });

  const submitOperation = useCallback(
    async ({ operation, fallbackError }: SubmitWebhookOperationParams) => {
      if (!client) {
        setState({ isSubmitting: false, error: "No client available" });
        return;
      }

      setState({ isSubmitting: true, error: undefined });

      try {
        await operation(client);

        setState({ isSubmitting: false, error: undefined });
        dispatch({ type: "CLOSE_WEBHOOK_MODAL" });
        onSuccess?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : fallbackError;
        setState({ isSubmitting: false, error: message });
      }
    },
    [client, dispatch, onSuccess],
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
      }),
    [submitOperation],
  );

  const handleUpdate = useCallback(
    async ({
      webhookId,
      targetUrl,
      selectedEvents,
    }: {
      webhookId: string;
      targetUrl: string;
      selectedEvents: readonly WebhookEventType[];
    }) =>
      submitOperation({
        operation: (activeClient) =>
          updateWebhook(activeClient, webhookId, {
            targetUrl,
            subscriptions: selectedEvents.map((eventType) => ({ eventType })),
          }),
        fallbackError: "Failed to update webhook",
      }),
    [submitOperation],
  );

  const handleDelete = useCallback(
    async (webhookId: string) =>
      submitOperation({
        operation: (activeClient) => deleteWebhook(activeClient, webhookId),
        fallbackError: "Failed to delete webhook",
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
