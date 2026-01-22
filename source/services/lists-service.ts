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

export interface QueryListEntriesResult {
  readonly entries: readonly ListEntryInfo[];
  readonly nextCursor: string | null;
}

// Fetch all lists in the workspace
export async function fetchLists(
  client: AttioClient,
): Promise<readonly ListInfo[]> {
  const response = await getV2Lists({ client });

  if (response.error) {
    throw new Error(`Failed to fetch lists: ${JSON.stringify(response.error)}`);
  }

  const lists = response.data?.data ?? [];

  return lists.map((list) => ({
    id: list.id.list_id,
    apiSlug: list.api_slug,
    name: list.name,
    // parent_object is an array (legacy support), take first or join
    parentObject: list.parent_object[0] ?? "",
  }));
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
  const { limit = 25, cursor } = options;

  const response = await postV2ListsByListEntriesQuery({
    client,
    path: { list: listId as string },
    body: {
      limit,
      ...(cursor ? { offset: Number.parseInt(cursor, 10) } : {}),
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
  const currentOffset = cursor ? Number.parseInt(cursor, 10) : 0;
  const nextCursor =
    entries.length === limit ? String(currentOffset + limit) : null;

  return {
    entries,
    nextCursor,
  };
}
