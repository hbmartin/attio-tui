import type { AttioClient } from "attio-ts-sdk";
import {
  deleteV2WebhooksByWebhookId,
  getV2Webhooks,
  patchV2WebhooksByWebhookId,
  postV2Webhooks,
} from "attio-ts-sdk";
import type {
  AttioTypes,
  WebhookCreateSubscriptionInput,
  WebhookInfo,
  WebhookUpdateSubscriptionInput,
} from "../types/attio.js";
import {
  buildOffsetPaginationRequest,
  resolveOffsetPagination,
} from "../utils/pagination.js";

export interface QueryWebhooksResult {
  readonly webhooks: readonly WebhookInfo[];
  readonly nextCursor: string | null;
}

interface WebhookSubscriptionInput {
  readonly eventType: WebhookCreateSubscriptionInput["event_type"];
  readonly filter?: WebhookCreateSubscriptionInput["filter"];
}

export interface CreateWebhookInput {
  readonly targetUrl: AttioTypes.WebhookPayloadBase["target_url"];
  readonly subscriptions: readonly WebhookSubscriptionInput[];
}

interface WebhookUpdateSubscriptionInputShape {
  readonly eventType: WebhookUpdateSubscriptionInput["event_type"];
  readonly filter?: WebhookUpdateSubscriptionInput["filter"];
}

export interface UpdateWebhookInput {
  readonly targetUrl?: AttioTypes.WebhookPayloadBase["target_url"];
  readonly subscriptions?: readonly WebhookUpdateSubscriptionInputShape[];
}

type WebhookPayload = AttioTypes.WebhookPayloadBase;

function toWebhookInfo(webhook: WebhookPayload): WebhookInfo {
  return {
    id: webhook.id.webhook_id,
    targetUrl: webhook.target_url,
    status: webhook.status,
    subscriptions: webhook.subscriptions.map((subscription) => ({
      eventType: subscription.event_type,
      filter: subscription.filter,
    })),
    createdAt: webhook.created_at,
  };
}

// Fetch webhooks with pagination
export async function fetchWebhooks(
  client: AttioClient,
  options: {
    readonly limit?: number;
    readonly cursor?: string;
  } = {},
): Promise<QueryWebhooksResult> {
  const { limit, cursor } = options;
  const pagination = buildOffsetPaginationRequest({ limit, cursor });

  // Request one extra item to detect if more pages exist
  const response = await getV2Webhooks({
    client,
    query: {
      limit: pagination.requestLimit,
      ...(pagination.offset !== undefined ? { offset: pagination.offset } : {}),
    },
  });

  const { items: trimmedData, nextCursor } = resolveOffsetPagination({
    error: response.error,
    data: response.data?.data,
    pagination,
    errorMessage: "Failed to fetch webhooks",
  });

  const webhooks = trimmedData.map((webhook) => toWebhookInfo(webhook));

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
  const subscriptions: WebhookCreateSubscriptionInput[] =
    input.subscriptions.map((subscription) => ({
      event_type: subscription.eventType,
      filter: subscription.filter ?? null,
    }));

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

  return toWebhookInfo(webhook);
}

// Update an existing webhook
export async function updateWebhook(
  client: AttioClient,
  webhookId: string,
  input: UpdateWebhookInput,
): Promise<WebhookInfo> {
  const subscriptions: WebhookUpdateSubscriptionInput[] | undefined =
    input.subscriptions?.map((subscription) => ({
      event_type: subscription.eventType,
      filter: subscription.filter ?? null,
    }));

  const response = await patchV2WebhooksByWebhookId({
    client,
    path: { webhook_id: webhookId },
    body: {
      data: {
        ...(input.targetUrl ? { target_url: input.targetUrl } : {}),
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

  return toWebhookInfo(webhook);
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
