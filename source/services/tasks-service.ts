import type { AttioClient } from "attio-ts-sdk";
import { getV2Tasks } from "attio-ts-sdk";

export interface TaskInfo {
  readonly id: string;
  readonly content: string;
  readonly deadlineAt: string | null;
  readonly isCompleted: boolean;
  readonly assignees: readonly {
    readonly actorType: string;
    readonly actorId: string;
  }[];
  readonly linkedRecords: readonly {
    readonly targetObject: string;
    readonly targetRecordId: string;
  }[];
  readonly createdAt: string;
}

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
  const {
    limit = 25,
    cursor,
    linkedObject,
    linkedRecordId,
    isCompleted,
  } = options;

  const response = await getV2Tasks({
    client,
    query: {
      limit,
      ...(cursor ? { offset: Number.parseInt(cursor, 10) } : {}),
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
  const currentOffset = cursor ? Number.parseInt(cursor, 10) : 0;
  const nextCursor =
    tasks.length === limit ? String(currentOffset + limit) : null;

  return {
    tasks,
    nextCursor,
  };
}
