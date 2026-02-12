import type { AttioClient } from "attio-ts-sdk";
import {
  getV2ByTargetByIdentifierAttributes,
  getV2ByTargetByIdentifierAttributesByAttributeStatuses,
  getV2Lists,
  postV2ListsByListEntriesQuery,
} from "attio-ts-sdk";
import type { ListEntryInfo, ListInfo, StatusInfo } from "../types/attio.js";
import type { ListId } from "../types/ids.js";
import { parseCursorOffset } from "../utils/pagination.js";

export interface QueryListsResult {
  readonly lists: readonly ListInfo[];
  readonly nextCursor: string | null;
}

export interface QueryListEntriesResult {
  readonly entries: readonly ListEntryInfo[];
  readonly nextCursor: string | null;
}

const listCache = new WeakMap<AttioClient, readonly ListInfo[]>();
const DEFAULT_LIST_LIMIT = 25;

function normalizeLimit(limit: number | undefined): number {
  if (limit !== undefined && Number.isFinite(limit) && limit > 0) {
    return limit;
  }
  return DEFAULT_LIST_LIMIT;
}

async function fetchAllLists(
  client: AttioClient,
): Promise<readonly ListInfo[]> {
  const response = await getV2Lists({ client });

  if (response.error) {
    throw new Error(`Failed to fetch lists: ${JSON.stringify(response.error)}`);
  }

  const lists = response.data?.data ?? [];

  const mapped = lists.map((list) => ({
    id: list.id.list_id,
    apiSlug: list.api_slug,
    name: list.name,
    // parent_object is an array (legacy support), take first or join
    parentObject: list.parent_object[0] ?? "",
  }));

  listCache.set(client, mapped);
  return mapped;
}

// Fetch lists in the workspace with pagination
export async function fetchLists(
  client: AttioClient,
  options: {
    readonly limit?: number;
    readonly cursor?: string;
  } = {},
): Promise<QueryListsResult> {
  const { limit, cursor } = options;
  const normalizedLimit = normalizeLimit(limit);
  const offset = parseCursorOffset(cursor);

  const lists =
    cursor === undefined || offset === undefined
      ? await fetchAllLists(client)
      : (listCache.get(client) ?? (await fetchAllLists(client)));

  const currentOffset = offset ?? 0;
  const pagedLists = lists.slice(
    currentOffset,
    currentOffset + normalizedLimit,
  );
  const nextCursor =
    currentOffset + normalizedLimit < lists.length
      ? String(currentOffset + normalizedLimit)
      : null;

  return {
    lists: pagedLists,
    nextCursor,
  };
}

// Query entries for a specific list, optionally filtered by status
export async function queryListEntries(
  client: AttioClient,
  listId: ListId,
  options: {
    readonly limit?: number;
    readonly cursor?: string;
    readonly filter?: Record<string, unknown>;
  } = {},
): Promise<QueryListEntriesResult> {
  const { limit, cursor, filter } = options;
  const normalizedLimit = normalizeLimit(limit);
  const offset = parseCursorOffset(cursor);

  // Request one extra row to detect if more pages exist
  const response = await postV2ListsByListEntriesQuery({
    client,
    path: { list: listId },
    body: {
      limit: normalizedLimit + 1,
      ...(offset !== undefined ? { offset } : {}),
      ...(filter ? { filter } : {}),
    },
  });

  if (response.error) {
    throw new Error(
      `Failed to query list entries: ${JSON.stringify(response.error)}`,
    );
  }

  const data = response.data?.data ?? [];
  const hasMore = data.length > normalizedLimit;
  const trimmedData = hasMore ? data.slice(0, normalizedLimit) : data;

  const entries = trimmedData.map((entry) => ({
    id: entry.id.entry_id,
    listId: entry.id.list_id,
    parentRecordId: entry.parent_record_id,
    values: entry.entry_values,
    createdAt: entry.created_at,
  }));

  // Calculate next cursor only when more data exists
  const currentOffset = offset ?? 0;
  const nextCursor = hasMore ? String(currentOffset + normalizedLimit) : null;

  return {
    entries,
    nextCursor,
  };
}

// Result for finding a status attribute on a list
export interface ListStatusAttributeInfo {
  readonly slug: string;
  readonly title: string;
  readonly attributeId: string;
}

// Find the first status-type attribute on a list, if any
export async function findListStatusAttribute(
  client: AttioClient,
  listId: string,
): Promise<ListStatusAttributeInfo | undefined> {
  const response = await getV2ByTargetByIdentifierAttributes({
    client,
    path: { target: "lists", identifier: listId },
  });

  if (response.error) {
    throw new Error(
      `Failed to fetch list attributes: ${JSON.stringify(response.error)}`,
    );
  }

  const attributes = response.data?.data ?? [];
  const statusAttr = attributes.find((attr) => attr.type === "status");

  if (!statusAttr) {
    return;
  }

  return {
    slug: statusAttr.api_slug,
    title: statusAttr.title,
    attributeId: statusAttr.id.attribute_id,
  };
}

// Fetch statuses for a list's status attribute
export async function fetchListStatuses(
  client: AttioClient,
  listId: string,
  attributeSlug: string,
): Promise<readonly StatusInfo[]> {
  const response = await getV2ByTargetByIdentifierAttributesByAttributeStatuses(
    {
      client,
      path: {
        target: "lists",
        identifier: listId,
        attribute: attributeSlug,
      },
    },
  );

  if (response.error) {
    throw new Error(
      `Failed to fetch statuses: ${JSON.stringify(response.error)}`,
    );
  }

  const statuses = response.data?.data ?? [];

  return statuses.map((status) => ({
    statusId: status.id.status_id,
    attributeId: status.id.attribute_id,
    title: status.title,
    isArchived: status.is_archived,
    celebrationEnabled: status.celebration_enabled,
    targetTimeInStatus: status.target_time_in_status,
  }));
}

// Build a status filter for list entry queries
export function buildStatusFilter(
  attributeSlug: string,
  statusId: string,
): Record<string, unknown> {
  return {
    [attributeSlug]: { status: { $eq: statusId } },
  };
}
