import type { AttioClient } from "attio-ts-sdk";
import { getV2Notes } from "attio-ts-sdk";
import type { NoteInfo } from "../types/attio.js";
import {
  buildOffsetPaginationRequest,
  resolveOffsetPagination,
} from "../utils/pagination.js";

export interface QueryNotesResult {
  readonly notes: readonly NoteInfo[];
  readonly nextCursor: string | null;
}

// Fetch notes with pagination
export async function fetchNotes(
  client: AttioClient,
  options: {
    readonly limit?: number;
    readonly cursor?: string;
    readonly parentObject?: string;
    readonly parentRecordId?: string;
  } = {},
): Promise<QueryNotesResult> {
  const { limit, cursor, parentObject, parentRecordId } = options;
  const pagination = buildOffsetPaginationRequest({ limit, cursor });

  // Request one extra item to detect if more pages exist
  const response = await getV2Notes({
    client,
    query: {
      limit: pagination.requestLimit,
      ...(pagination.offset !== undefined ? { offset: pagination.offset } : {}),
      ...(parentObject ? { parent_object: parentObject } : {}),
      ...(parentRecordId ? { parent_record_id: parentRecordId } : {}),
    },
  });

  const { items: trimmedData, nextCursor } = resolveOffsetPagination({
    error: response.error,
    data: response.data?.data,
    pagination,
    errorMessage: "Failed to fetch notes",
  });

  const notes: NoteInfo[] = trimmedData.map((note) => {
    const createdByType: NoteInfo["createdByType"] =
      note.created_by_actor.type ?? "unknown";
    const createdById: NoteInfo["createdById"] = note.created_by_actor.id ?? "";

    return {
      id: note.id.note_id,
      parentObject: note.parent_object,
      parentRecordId: note.parent_record_id,
      title: note.title,
      contentPlaintext: note.content_plaintext,
      createdAt: note.created_at,
      createdByType,
      createdById,
    };
  });

  return {
    notes,
    nextCursor,
  };
}
