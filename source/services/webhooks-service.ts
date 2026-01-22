import type { AttioClient } from "attio-ts-sdk";
import {
  deleteV2WebhooksByWebhookId,
  getV2Webhooks,
  patchV2WebhooksByWebhookId,
  postV2Webhooks,
} from "attio-ts-sdk";

// Webhook subscription info - filter and eventType stored as-is from SDK
export interface WebhookSubscription {
  readonly eventType: string;
  readonly filter: unknown;
}

export interface WebhookInfo {
  readonly id: string;
  readonly targetUrl: string;
  readonly status: "active" | "paused";
  readonly subscriptions: readonly WebhookSubscription[];
  readonly createdAt: string;
}

export interface QueryWebhooksResult {
  readonly webhooks: readonly WebhookInfo[];
  readonly nextCursor: string | null;
}

export interface CreateWebhookInput {
  readonly targetUrl: string;
  readonly subscriptions: readonly {
    readonly eventType: string;
    readonly filter?: unknown;
  }[];
}

export interface UpdateWebhookInput {
  readonly targetUrl?: string;
  readonly status?: "active" | "paused";
  readonly subscriptions?: readonly {
    readonly eventType: string;
    readonly filter?: unknown;
  }[];
}

// Fetch webhooks with pagination
export async function fetchWebhooks(
  client: AttioClient,
  options: {
    readonly limit?: number;
    readonly cursor?: string;
  } = {},
): Promise<QueryWebhooksResult> {
  const { limit = 25, cursor } = options;

  const response = await getV2Webhooks({
    client,
    query: {
      limit,
      ...(cursor ? { offset: Number.parseInt(cursor, 10) } : {}),
    },
  });

  if (response.error) {
    throw new Error(
      `Failed to fetch webhooks: ${JSON.stringify(response.error)}`,
    );
  }

  const data = response.data?.data ?? [];
  const webhooks = data.map((webhook) => ({
    id: webhook.id.webhook_id,
    targetUrl: webhook.target_url,
    status: webhook.status as "active" | "paused",
    subscriptions: webhook.subscriptions.map((s) => ({
      eventType: s.event_type,
      filter: s.filter,
    })),
    createdAt: webhook.created_at,
  }));

  const currentOffset = cursor ? Number.parseInt(cursor, 10) : 0;
  const nextCursor =
    webhooks.length === limit ? String(currentOffset + limit) : null;

  return {
    webhooks,
    nextCursor,
  };
}

// Create a new webhook
export async function createWebhook(
  client: AttioClient,
  input: CreateWebhookInput,
): Promise<WebhookInfo> {
  // Cast to bypass strict SDK typing - eventType comes from user input
  const subscriptions = input.subscriptions.map((s) => ({
    event_type: s.eventType,
    filter: s.filter ?? null,
  })) as Parameters<typeof postV2Webhooks>[0]["body"]["data"]["subscriptions"];

  const response = await postV2Webhooks({
    client,
    body: {
      data: {
        target_url: input.targetUrl,
        subscriptions,
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
  // Build subscriptions with cast if provided
  const subscriptions = input.subscriptions
    ? (input.subscriptions.map((s) => ({
        event_type: s.eventType,
        filter: s.filter ?? null,
      })) as Parameters<
        typeof patchV2WebhooksByWebhookId
      >[0]["body"]["data"]["subscriptions"])
    : undefined;

  const response = await patchV2WebhooksByWebhookId({
    client,
    path: { webhook_id: webhookId },
    body: {
      data: {
        ...(input.targetUrl ? { target_url: input.targetUrl } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(subscriptions ? { subscriptions } : {}),
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
