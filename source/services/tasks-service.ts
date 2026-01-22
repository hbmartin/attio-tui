import type { AttioClient } from "attio-ts-sdk";
import { getV2Tasks } from "attio-ts-sdk";
import type { TaskInfo } from "../types/attio.js";

export interface QueryTasksResult {
  readonly tasks: readonly TaskInfo[];
  readonly nextCursor: string | null;
}

// Fetch tasks with pagination
export async function fetchTasks(
  client: AttioClient,
  options: {
    readonly limit?: number;
    readonly cursor?: string;
    readonly linkedObject?: string;
    readonly linkedRecordId?: string;
    readonly isCompleted?: boolean;
  } = {},
): Promise<QueryTasksResult> {
  const { limit, cursor, linkedObject, linkedRecordId, isCompleted } = options;
  let parsedOffset: number | undefined = cursor
    ? Number.parseInt(cursor, 10)
    : 0;

  if (parsedOffset !== undefined && Number.isNaN(parsedOffset)) {
    parsedOffset = undefined;
  }

  const effectiveLimit = Math.max(1, Number(limit) || 25);

  const response = await getV2Tasks({
    client,
    query: {
      limit: effectiveLimit,
      ...(parsedOffset !== undefined ? { offset: parsedOffset } : {}),
      ...(linkedObject ? { linked_object: linkedObject } : {}),
      ...(linkedRecordId ? { linked_record_id: linkedRecordId } : {}),
      ...(isCompleted !== undefined ? { is_completed: isCompleted } : {}),
    },
  });

  if (response.error) {
    throw new Error(`Failed to fetch tasks: ${JSON.stringify(response.error)}`);
  }

  const data = response.data?.data ?? [];
  const tasks = data.map((task) => ({
    id: task.id.task_id,
    content: task.content_plaintext,
    deadlineAt: task.deadline_at,
    isCompleted: task.is_completed,
    assignees: task.assignees.map((a) => ({
      actorType: a.referenced_actor_type,
      actorId: a.referenced_actor_id,
    })),
    linkedRecords: task.linked_records.map((r) => ({
      targetObject: r.target_object_id,
      targetRecordId: r.target_record_id,
    })),
    createdAt: task.created_at,
  }));

  // Calculate next cursor based on offset
  const nextCursor =
    parsedOffset !== undefined && tasks.length === effectiveLimit
      ? String(parsedOffset + tasks.length)
      : null;

  return {
    tasks,
    nextCursor,
  };
}
