import type { AttioClient } from "attio-ts-sdk";
import {
  getV2Objects,
  getV2ObjectsByObjectRecordsByRecordId,
  postV2ObjectsByObjectRecordsQuery,
} from "attio-ts-sdk";
import type { ObjectSlug } from "../types/ids.js";

export interface ObjectInfo {
  readonly id: string;
  readonly apiSlug: string;
  readonly singularNoun: string;
  readonly pluralNoun: string;
}

export interface RecordInfo {
  readonly id: string;
  readonly objectId: string;
  readonly values: Record<string, unknown>;
  readonly createdAt: string;
}

export interface QueryRecordsResult {
  readonly records: readonly RecordInfo[];
  readonly nextCursor: string | null;
}

interface RecordPayload {
  readonly id: {
    readonly record_id: string;
    readonly object_id: string;
  };
  readonly values: Record<string, unknown>;
  readonly created_at: string;
}

function toRecordInfo(record: RecordPayload): RecordInfo {
  return {
    id: record.id.record_id,
    objectId: record.id.object_id,
    values: record.values,
    createdAt: record.created_at,
  };
}

// Fetch all objects in the workspace
export async function fetchObjects(
  client: AttioClient,
): Promise<readonly ObjectInfo[]> {
  const response = await getV2Objects({ client });

  if (response.error) {
    throw new Error(
      `Failed to fetch objects: ${JSON.stringify(response.error)}`,
    );
  }

  const objects = response.data?.data ?? [];

  return objects
    .filter((obj) => obj.api_slug !== null)
    .map((obj) => ({
      id: obj.id.object_id,
      apiSlug: obj.api_slug ?? "",
      singularNoun: obj.singular_noun ?? "",
      pluralNoun: obj.plural_noun ?? "",
    }));
}

// Query records for a specific object
export async function queryRecords(
  client: AttioClient,
  objectSlug: ObjectSlug,
  options: {
    readonly limit?: number;
    readonly cursor?: string;
    readonly sorts?: {
      attribute: string;
      direction: "asc" | "desc";
    }[];
  } = {},
): Promise<QueryRecordsResult> {
  const { limit = 25, cursor, sorts } = options;

  const response = await postV2ObjectsByObjectRecordsQuery({
    client,
    path: { object: objectSlug },
    body: {
      limit,
      ...(cursor ? { offset: Number.parseInt(cursor, 10) } : {}),
      ...(sorts && sorts.length > 0 ? { sorts } : {}),
    },
  });

  if (response.error) {
    throw new Error(
      `Failed to query records: ${JSON.stringify(response.error)}`,
    );
  }

  const data = response.data?.data ?? [];
  const records = data.map((record) => toRecordInfo(record));

  // Calculate next cursor based on offset
  const currentOffset = cursor ? Number.parseInt(cursor, 10) : 0;
  const nextCursor =
    records.length === limit ? String(currentOffset + limit) : null;

  return {
    records,
    nextCursor,
  };
}

// Get a single record by ID
export async function getRecord(
  client: AttioClient,
  objectSlug: ObjectSlug,
  recordId: string,
): Promise<RecordInfo | undefined> {
  const response = await getV2ObjectsByObjectRecordsByRecordId({
    client,
    path: {
      object: objectSlug,
      record_id: recordId,
    },
  });

  if (response.error) {
    if (response.error.status_code === 404) {
      return;
    }

    throw new Error(
      `Failed to fetch record: ${JSON.stringify(response.error)}`,
    );
  }

  const record = response.data?.data;
  return record ? toRecordInfo(record) : undefined;
}
