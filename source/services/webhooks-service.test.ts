import {
  createAttioClient,
  type GetV2WebhooksResponses,
  getV2Webhooks,
} from "attio-ts-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWebhooks } from "./webhooks-service.js";

vi.mock("attio-ts-sdk", async () => {
  const actual =
    await vi.importActual<typeof import("attio-ts-sdk")>("attio-ts-sdk");

  return {
    ...actual,
    getV2Webhooks: vi.fn(),
    deleteV2WebhooksByWebhookId: vi.fn(),
    patchV2WebhooksByWebhookId: vi.fn(),
    postV2Webhooks: vi.fn(),
  };
});

const buildRequest = (): Request => new Request("https://example.com");

const buildResponse = (status: number): Response =>
  new Response(null, { status });

const buildSuccess = <TData>(data: TData) => ({
  data,
  error: undefined,
  request: buildRequest(),
  response: buildResponse(200),
});

const buildError = <TError>(error: TError, status: number) => ({
  data: undefined,
  error,
  request: buildRequest(),
  response: buildResponse(status),
});

const buildWebhook = (
  webhookId: string,
  targetUrl: string,
): GetV2WebhooksResponses[200]["data"][number] => ({
  target_url: targetUrl,
  subscriptions: [
    {
      event_type: "note.created",
      filter: null,
    },
  ],
  id: {
    workspace_id: "workspace-1",
    webhook_id: webhookId,
  },
  status: "active",
  created_at: "2025-01-01T00:00:00Z",
});

describe("fetchWebhooks", () => {
  const client = createAttioClient({
    apiKey: "at_0123456789abcdef0123456789abcdef0123456789abcdef",
  });
  const mockGetV2Webhooks = vi.mocked(getV2Webhooks);

  beforeEach(() => {
    mockGetV2Webhooks.mockReset();
  });

  it("maps webhooks and computes next cursor", async () => {
    const webhooksData: GetV2WebhooksResponses[200]["data"] = [
      buildWebhook("wh-1", "https://example.com/one"),
    ];

    mockGetV2Webhooks.mockResolvedValue(buildSuccess({ data: webhooksData }));

    const result = await fetchWebhooks(client, { limit: 1 });

    expect(result.webhooks).toHaveLength(1);
    expect(result.webhooks[0]).toEqual({
      id: "wh-1",
      targetUrl: "https://example.com/one",
      status: "active",
      subscriptions: [
        {
          eventType: "note.created",
          filter: null,
        },
      ],
      createdAt: "2025-01-01T00:00:00Z",
    });
    expect(result.nextCursor).toBe("1");
    expect(mockGetV2Webhooks).toHaveBeenCalledWith({
      client,
      query: {
        limit: 1,
      },
    });
  });

  it("throws when the API returns an error", async () => {
    mockGetV2Webhooks.mockResolvedValue(
      buildError(
        {
          status_code: 500,
          type: "api_error",
          code: "server_error",
          message: "Server error",
        },
        500,
      ),
    );

    await expect(fetchWebhooks(client)).rejects.toThrow(
      "Failed to fetch webhooks",
    );
  });
});
