import type { AttioClient } from "attio-ts-sdk";
import { getV2Lists, postV2ListsByListEntriesQuery } from "attio-ts-sdk";
import type { ListId } from "../types/ids.js";

export interface ListInfo {
  readonly id: string;
  readonly apiSlug: string;
  readonly name: string;
  readonly parentObject: string;
}

export interface ListEntryInfo {
  readonly id: string;
  readonly listId: string;
  readonly parentRecordId: string;
  readonly values: Record<string, unknown>;
  readonly createdAt: string;
}

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

function parseCursorOffset(cursor: string | undefined): number | undefined {
  if (cursor === undefined) {
    return;
  }

  const parsed = Number.parseInt(cursor, 10);

  if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return;
  }

  return parsed;
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

// Query entries for a specific list
export async function queryListEntries(
  client: AttioClient,
  listId: ListId,
  options: {
    readonly limit?: number;
    readonly cursor?: string;
  } = {},
): Promise<QueryListEntriesResult> {
  const { limit, cursor } = options;
  const normalizedLimit = normalizeLimit(limit);
  const offset = parseCursorOffset(cursor);

  const response = await postV2ListsByListEntriesQuery({
    client,
    path: { list: listId as string },
    body: {
      limit: normalizedLimit,
      ...(offset !== undefined ? { offset } : {}),
    },
  });

  if (response.error) {
    throw new Error(
      `Failed to query list entries: ${JSON.stringify(response.error)}`,
    );
  }

  const data = response.data?.data ?? [];
  const entries = data.map((entry) => ({
    id: entry.id.entry_id,
    listId: entry.id.list_id,
    parentRecordId: entry.parent_record_id,
    values: entry.entry_values as Record<string, unknown>,
    createdAt: entry.created_at,
  }));

  // Calculate next cursor based on offset
  const currentOffset = offset ?? 0;
  const nextCursor =
    entries.length === normalizedLimit
      ? String(currentOffset + normalizedLimit)
      : null;

  return {
    entries,
    nextCursor,
  };
}
