import {
  createAttioClient,
  type GetV2ByTargetByIdentifierAttributesByAttributeStatusesResponses,
  type GetV2ByTargetByIdentifierAttributesResponses,
  type GetV2ListsResponses,
  getV2ByTargetByIdentifierAttributes,
  getV2ByTargetByIdentifierAttributesByAttributeStatuses,
  getV2Lists,
  type PostV2ListsByListEntriesQueryResponses,
  postV2ListsByListEntriesQuery,
} from "attio-ts-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildStatusFilter,
  fetchListStatuses,
  fetchLists,
  findListStatusAttribute,
  queryListEntries,
} from "../../source/services/lists-service.js";
import { createListId } from "../../source/types/ids.js";

vi.mock("attio-ts-sdk", async () => {
  const actual =
    await vi.importActual<typeof import("attio-ts-sdk")>("attio-ts-sdk");

  return {
    ...actual,
    getV2Lists: vi.fn(),
    postV2ListsByListEntriesQuery: vi.fn(),
    getV2ByTargetByIdentifierAttributes: vi.fn(),
    getV2ByTargetByIdentifierAttributesByAttributeStatuses: vi.fn(),
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

const buildList = (
  listId: string,
  name: string,
): GetV2ListsResponses[200]["data"][number] => ({
  id: {
    workspace_id: "workspace-1",
    list_id: listId,
  },
  api_slug: name.toLowerCase(),
  name,
  parent_object: ["companies"],
  workspace_access: "read-only",
  workspace_member_access: [],
  created_by_actor: {},
  created_at: "2025-01-01T00:00:00Z",
});

describe("fetchLists", () => {
  const client = createAttioClient({
    apiKey: "at_0123456789abcdef0123456789abcdef0123456789abcdef",
  });
  const mockGetV2Lists = vi.mocked(getV2Lists);

  beforeEach(() => {
    mockGetV2Lists.mockReset();
  });

  it("paginates lists and reuses cached results", async () => {
    const listData: GetV2ListsResponses[200]["data"] = [
      buildList("list-1", "Alpha"),
      buildList("list-2", "Beta"),
      buildList("list-3", "Gamma"),
    ];

    mockGetV2Lists.mockResolvedValue(buildSuccess({ data: listData }));

    const firstPage = await fetchLists(client, { limit: 2 });

    expect(firstPage.lists).toHaveLength(2);
    expect(firstPage.nextCursor).toBe("2");

    const secondPage = await fetchLists(client, { cursor: "2", limit: 2 });

    expect(secondPage.lists).toHaveLength(1);
    expect(secondPage.lists[0]?.id).toBe("list-3");
    expect(secondPage.nextCursor).toBeNull();
    expect(mockGetV2Lists).toHaveBeenCalledTimes(1);
  });

  it("refreshes when cursor is undefined", async () => {
    const listData: GetV2ListsResponses[200]["data"] = [
      buildList("list-1", "Alpha"),
    ];

    mockGetV2Lists
      .mockResolvedValueOnce(buildSuccess({ data: listData }))
      .mockResolvedValueOnce(buildSuccess({ data: listData }));

    await fetchLists(client);
    await fetchLists(client);

    expect(mockGetV2Lists).toHaveBeenCalledTimes(2);
  });

  it("throws when the API returns an error", async () => {
    mockGetV2Lists.mockResolvedValue(
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

    await expect(fetchLists(client)).rejects.toThrow("Failed to fetch lists");
  });

  it("normalizes invalid cursor and non-positive limit", async () => {
    const listData: GetV2ListsResponses[200]["data"] = [
      buildList("list-1", "Alpha"),
      buildList("list-2", "Beta"),
    ];

    mockGetV2Lists.mockResolvedValue(buildSuccess({ data: listData }));

    const result = await fetchLists(client, { cursor: "oops", limit: 0 });

    expect(result.lists).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });
});

describe("queryListEntries", () => {
  const client = createAttioClient({
    apiKey: "at_0123456789abcdef0123456789abcdef0123456789abcdef",
  });
  const mockQueryListEntries = vi.mocked(postV2ListsByListEntriesQuery);

  beforeEach(() => {
    mockQueryListEntries.mockReset();
  });

  const buildEntry = (
    listId: string,
    entryId: string,
  ): PostV2ListsByListEntriesQueryResponses[200]["data"][number] => ({
    id: {
      workspace_id: "workspace-1",
      list_id: listId,
      entry_id: entryId,
    },
    parent_record_id: "record-1",
    parent_object: "companies",
    created_at: "2025-01-01T00:00:00Z",
    entry_values: {},
  });

  it("omits invalid cursor and enforces positive limit", async () => {
    const listId = createListId("11111111-1111-1111-8111-111111111111");

    mockQueryListEntries.mockResolvedValue(
      buildSuccess({ data: [buildEntry(listId, "entry-1")] }),
    );

    const result = await queryListEntries(client, listId, {
      cursor: "nope",
      limit: 0,
    });

    const [call] = mockQueryListEntries.mock.calls;

    expect(call?.[0].path).toEqual({ list: listId });
    // Requests DEFAULT_LIST_LIMIT + 1 to detect hasMore
    expect(call?.[0].body).toEqual({ limit: 26 });
    expect(result.nextCursor).toBeNull();
  });

  it("passes valid cursor offsets through to the API", async () => {
    const listId = createListId("22222222-2222-2222-8222-222222222222");

    mockQueryListEntries.mockResolvedValue(
      buildSuccess({ data: [buildEntry(listId, "entry-1")] }),
    );

    await queryListEntries(client, listId, { cursor: "5", limit: 1 });

    const [call] = mockQueryListEntries.mock.calls;

    expect(call?.[0].path).toEqual({ list: listId });
    // Requests limit + 1 to detect hasMore
    expect(call?.[0].body).toEqual({ limit: 2, offset: 5 });
  });

  it("returns null nextCursor when total rows equal limit (no extra row)", async () => {
    const listId = createListId("33333333-3333-3333-8333-333333333333");

    // API returns exactly 2 rows when we requested 3 (limit=2, request=limit+1)
    // This means there are no more pages
    mockQueryListEntries.mockResolvedValue(
      buildSuccess({
        data: [buildEntry(listId, "entry-1"), buildEntry(listId, "entry-2")],
      }),
    );

    const result = await queryListEntries(client, listId, { limit: 2 });

    expect(result.entries).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });

  it("returns nextCursor when more rows exist (extra row returned)", async () => {
    const listId = createListId("44444444-4444-4444-8444-444444444444");

    // API returns 3 rows when we requested 3 (limit=2, request=limit+1)
    // This means there are more pages - we should trim and signal hasMore
    mockQueryListEntries.mockResolvedValue(
      buildSuccess({
        data: [
          buildEntry(listId, "entry-1"),
          buildEntry(listId, "entry-2"),
          buildEntry(listId, "entry-3"),
        ],
      }),
    );

    const result = await queryListEntries(client, listId, { limit: 2 });

    // Should only return 2 entries (trimmed)
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]?.id).toBe("entry-1");
    expect(result.entries[1]?.id).toBe("entry-2");
    // Should have nextCursor since there was an extra row
    expect(result.nextCursor).toBe("2");
  });
});

describe("buildStatusFilter", () => {
  it("returns filter object without outer filter key", () => {
    const result = buildStatusFilter("stage", "status-123");

    expect(result).toEqual({
      stage: { status: { $eq: "status-123" } },
    });
  });

  it("produces correct query shape when spread into filter property", () => {
    const filter = buildStatusFilter("pipeline", "s-456");
    const body = {
      limit: 26,
      ...(filter ? { filter } : {}),
    };

    expect(body).toEqual({
      limit: 26,
      filter: {
        pipeline: { status: { $eq: "s-456" } },
      },
    });
  });
});

describe("findListStatusAttribute", () => {
  const client = createAttioClient({
    apiKey: "at_0123456789abcdef0123456789abcdef0123456789abcdef",
  });
  const mockGetAttributes = vi.mocked(getV2ByTargetByIdentifierAttributes);

  beforeEach(() => {
    mockGetAttributes.mockReset();
  });

  const buildAttribute = (
    type: string,
    slug: string,
  ): GetV2ByTargetByIdentifierAttributesResponses[200]["data"][number] =>
    ({
      id: {
        workspace_id: "ws-1",
        object_id: "obj-1",
        attribute_id: `attr-${slug}`,
      },
      title: slug.charAt(0).toUpperCase() + slug.slice(1),
      api_slug: slug,
      type,
      description: null,
      is_system_attribute: false,
      is_writable: true,
      is_required: false,
      is_unique: false,
      is_multiselect: false,
      is_default_value_enabled: false,
      is_archived: false,
      default_value: null,
      relationship: null,
      created_at: "2025-01-01T00:00:00Z",
      config: { currency: null, record_reference: null },
    }) as GetV2ByTargetByIdentifierAttributesResponses[200]["data"][number];

  it("should return the first status attribute when found", async () => {
    mockGetAttributes.mockResolvedValue(
      buildSuccess({
        data: [
          buildAttribute("text", "name"),
          buildAttribute("status", "stage"),
          buildAttribute("number", "amount"),
        ],
      }),
    );

    const result = await findListStatusAttribute(client, "list-1");

    expect(result).toEqual({
      slug: "stage",
      title: "Stage",
      attributeId: "attr-stage",
    });
  });

  it("should return undefined when no status attribute exists", async () => {
    mockGetAttributes.mockResolvedValue(
      buildSuccess({
        data: [
          buildAttribute("text", "name"),
          buildAttribute("number", "amount"),
        ],
      }),
    );

    const result = await findListStatusAttribute(client, "list-1");

    expect(result).toBeUndefined();
  });

  it("should throw on API error", async () => {
    mockGetAttributes.mockResolvedValue(
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

    await expect(findListStatusAttribute(client, "list-1")).rejects.toThrow(
      "Failed to fetch list attributes",
    );
  });
});

describe("fetchListStatuses", () => {
  const client = createAttioClient({
    apiKey: "at_0123456789abcdef0123456789abcdef0123456789abcdef",
  });
  const mockGetStatuses = vi.mocked(
    getV2ByTargetByIdentifierAttributesByAttributeStatuses,
  );

  beforeEach(() => {
    mockGetStatuses.mockReset();
  });

  const buildStatus = (
    statusId: string,
    title: string,
    isArchived = false,
  ): GetV2ByTargetByIdentifierAttributesByAttributeStatusesResponses[200]["data"][number] => ({
    id: {
      workspace_id: "ws-1",
      object_id: "obj-1",
      attribute_id: "attr-1",
      status_id: statusId,
    },
    title,
    is_archived: isArchived,
    celebration_enabled: false,
    target_time_in_status: null,
  });

  it("should map statuses to StatusInfo", async () => {
    mockGetStatuses.mockResolvedValue(
      buildSuccess({
        data: [
          buildStatus("s-1", "Prospecting"),
          buildStatus("s-2", "Negotiation"),
          buildStatus("s-3", "Won"),
        ],
      }),
    );

    const result = await fetchListStatuses(client, "list-1", "stage");

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      statusId: "s-1",
      attributeId: "attr-1",
      title: "Prospecting",
      isArchived: false,
      celebrationEnabled: false,
      targetTimeInStatus: null,
    });
  });

  it("should include archived statuses in the result", async () => {
    mockGetStatuses.mockResolvedValue(
      buildSuccess({
        data: [
          buildStatus("s-1", "Active"),
          buildStatus("s-2", "Archived", true),
        ],
      }),
    );

    const result = await fetchListStatuses(client, "list-1", "stage");

    expect(result).toHaveLength(2);
    expect(result[1]?.isArchived).toBe(true);
  });

  it("should throw on API error", async () => {
    mockGetStatuses.mockResolvedValue(
      buildError(
        {
          status_code: 404,
          type: "not_found",
          code: "not_found",
          message: "Attribute not found",
        },
        404,
      ),
    );

    await expect(fetchListStatuses(client, "list-1", "stage")).rejects.toThrow(
      "Failed to fetch statuses",
    );
  });
});
