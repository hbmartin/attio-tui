import type { AttioClient } from "attio-ts-sdk";
import { getV2Notes } from "attio-ts-sdk";

export interface NoteInfo {
  readonly id: string;
  readonly parentObject: string;
  readonly parentRecordId: string;
  readonly title: string;
  readonly contentPlaintext: string;
  readonly createdAt: string;
  readonly createdByType: string;
  readonly createdById: string;
}

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
  const { limit = 25, cursor, parentObject, parentRecordId } = options;

  const response = await getV2Notes({
    client,
    query: {
      limit,
      ...(cursor ? { offset: Number.parseInt(cursor, 10) } : {}),
      ...(parentObject ? { parent_object: parentObject } : {}),
      ...(parentRecordId ? { parent_record_id: parentRecordId } : {}),
    },
  });

  if (response.error) {
    throw new Error(`Failed to fetch notes: ${JSON.stringify(response.error)}`);
  }

  const data = response.data?.data ?? [];
  const notes = data.map((note) => ({
    id: note.id.note_id,
    parentObject: note.parent_object,
    parentRecordId: note.parent_record_id,
    title: note.title,
    contentPlaintext: note.content_plaintext,
    createdAt: note.created_at,
    createdByType: note.created_by_actor.type ?? "unknown",
    createdById: note.created_by_actor.id ?? "",
  }));

  // Calculate next cursor based on offset
  const currentOffset = cursor ? Number.parseInt(cursor, 10) : 0;
  const nextCursor =
    notes.length === limit ? String(currentOffset + limit) : null;

  return {
    notes,
    nextCursor,
  };
}
