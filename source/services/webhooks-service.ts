import type { AttioClient } from "attio-ts-sdk";
import {
  deleteV2WebhooksByWebhookId,
  getV2Webhooks,
  patchV2WebhooksByWebhookId,
  postV2Webhooks,
} from "attio-ts-sdk";

// Webhook event types from the SDK
type WebhookEventType =
  | "call-recording.created"
  | "comment.created"
  | "comment.resolved"
  | "comment.unresolved"
  | "comment.deleted"
  | "list.created"
  | "list.updated"
  | "list.deleted"
  | "list-attribute.created"
  | "list-attribute.updated"
  | "list-attribute.deleted"
  | "list-entry.created"
  | "list-entry.updated"
  | "list-entry.deleted"
  | "note.created"
  | "note.updated"
  | "note.deleted"
  | "object.created"
  | "object.updated"
  | "object.deleted"
  | "object-attribute.created"
  | "object-attribute.updated"
  | "object-attribute.deleted"
  | "record.created"
  | "record.merged"
  | "record.updated"
  | "record.deleted"
  | "workspace-member.created";

// The filter can be complex - we just store it as-is
export interface WebhookSubscription {
  readonly eventType: WebhookEventType;
  readonly filter: unknown;
}

export interface WebhookInfo {
  readonly id: string;
  readonly targetUrl: string;
  readonly status: "active" | "paused";
  readonly subscriptions: readonly WebhookSubscription[];
  readonly createdAt: string;
}

export interface CreateWebhookInput {
  readonly targetUrl: string;
  readonly subscriptions: readonly {
    readonly eventType: WebhookEventType;
    readonly filter?: unknown;
  }[];
}

export interface UpdateWebhookInput {
  readonly targetUrl?: string;
  readonly status?: "active" | "paused";
  readonly subscriptions?: readonly {
    readonly eventType: WebhookEventType;
    readonly filter?: unknown;
  }[];
}

// Fetch all webhooks
export async function fetchWebhooks(
  client: AttioClient,
): Promise<readonly WebhookInfo[]> {
  const response = await getV2Webhooks({ client });

  if (response.error) {
    throw new Error(
      `Failed to fetch webhooks: ${JSON.stringify(response.error)}`,
    );
  }

  const data = response.data?.data ?? [];
  return data.map((webhook) => ({
    id: webhook.id.webhook_id,
    targetUrl: webhook.target_url,
    status: webhook.status as "active" | "paused",
    subscriptions: webhook.subscriptions.map((s) => ({
      eventType: s.event_type,
      filter: s.filter,
    })),
    createdAt: webhook.created_at,
  }));
}

// Create a new webhook
export async function createWebhook(
  client: AttioClient,
  input: CreateWebhookInput,
): Promise<WebhookInfo> {
  const response = await postV2Webhooks({
    client,
    body: {
      data: {
        target_url: input.targetUrl,
        subscriptions: input.subscriptions.map((s) => ({
          event_type: s.eventType,
          filter: (s.filter ?? null) as null,
        })),
      },
    },
  });

  if (response.error) {
    throw new Error(
      `Failed to create webhook: ${JSON.stringify(response.error)}`,
    );
  }

  const webhook = response.data?.data;
  if (!webhook) {
    throw new Error("No webhook data returned");
  }

  return {
    id: webhook.id.webhook_id,
    targetUrl: webhook.target_url,
    status: webhook.status as "active" | "paused",
    subscriptions: webhook.subscriptions.map((s) => ({
      eventType: s.event_type,
      filter: s.filter,
    })),
    createdAt: webhook.created_at,
  };
}

// Update an existing webhook
export async function updateWebhook(
  client: AttioClient,
  webhookId: string,
  input: UpdateWebhookInput,
): Promise<WebhookInfo> {
  const response = await patchV2WebhooksByWebhookId({
    client,
    path: { webhook_id: webhookId },
    body: {
      data: {
        ...(input.targetUrl ? { target_url: input.targetUrl } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.subscriptions
          ? {
              subscriptions: input.subscriptions.map((s) => ({
                event_type: s.eventType,
                filter: (s.filter ?? null) as null,
              })),
            }
          : {}),
      },
    },
  });

  if (response.error) {
    throw new Error(
      `Failed to update webhook: ${JSON.stringify(response.error)}`,
    );
  }

  const webhook = response.data?.data;
  if (!webhook) {
    throw new Error("No webhook data returned");
  }

  return {
    id: webhook.id.webhook_id,
    targetUrl: webhook.target_url,
    status: webhook.status as "active" | "paused",
    subscriptions: webhook.subscriptions.map((s) => ({
      eventType: s.event_type,
      filter: s.filter,
    })),
    createdAt: webhook.created_at,
  };
}

// Delete a webhook
export async function deleteWebhook(
  client: AttioClient,
  webhookId: string,
): Promise<void> {
  const response = await deleteV2WebhooksByWebhookId({
    client,
    path: { webhook_id: webhookId },
  });

  if (response.error) {
    throw new Error(
      `Failed to delete webhook: ${JSON.stringify(response.error)}`,
    );
  }
}
