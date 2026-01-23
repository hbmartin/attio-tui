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

export function useWebhookOperations({
  client,
  dispatch,
  onSuccess,
}: UseWebhookOperationsOptions) {
  const [state, setState] = useState<WebhookOperationsState>({
    isSubmitting: false,
    error: undefined,
  });

  const handleCreate = useCallback(
    async (targetUrl: string, selectedEvents: readonly string[]) => {
      if (!client) {
        setState({ isSubmitting: false, error: "No client available" });
        return;
      }

      setState({ isSubmitting: true, error: undefined });

      try {
        await createWebhook(client, {
          targetUrl,
          subscriptions: selectedEvents.map((eventType) => ({
            eventType: eventType as WebhookEventType,
          })),
        });

        setState({ isSubmitting: false, error: undefined });
        dispatch({ type: "CLOSE_WEBHOOK_MODAL" });
        onSuccess?.();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create webhook";
        setState({ isSubmitting: false, error: message });
      }
    },
    [client, dispatch, onSuccess],
  );

  const handleUpdate = useCallback(
    async (
      webhookId: string,
      targetUrl: string,
      selectedEvents: readonly string[],
    ) => {
      if (!client) {
        setState({ isSubmitting: false, error: "No client available" });
        return;
      }

      setState({ isSubmitting: true, error: undefined });

      try {
        await updateWebhook(client, webhookId, {
          targetUrl,
          subscriptions: selectedEvents.map((eventType) => ({
            eventType: eventType as WebhookEventType,
          })),
        });

        setState({ isSubmitting: false, error: undefined });
        dispatch({ type: "CLOSE_WEBHOOK_MODAL" });
        onSuccess?.();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update webhook";
        setState({ isSubmitting: false, error: message });
      }
    },
    [client, dispatch, onSuccess],
  );

  const handleDelete = useCallback(
    async (webhookId: string) => {
      if (!client) {
        setState({ isSubmitting: false, error: "No client available" });
        return;
      }

      setState({ isSubmitting: true, error: undefined });

      try {
        await deleteWebhook(client, webhookId);

        setState({ isSubmitting: false, error: undefined });
        dispatch({ type: "CLOSE_WEBHOOK_MODAL" });
        onSuccess?.();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete webhook";
        setState({ isSubmitting: false, error: message });
      }
    },
    [client, dispatch, onSuccess],
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
