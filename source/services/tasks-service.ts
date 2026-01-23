import type { AttioClient } from "attio-ts-sdk";
import { getV2Tasks } from "attio-ts-sdk";
import type { TaskInfo } from "../types/attio.js";
import {
  buildOffsetPaginationRequest,
  resolveOffsetPagination,
} from "../utils/pagination.js";

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
  const pagination = buildOffsetPaginationRequest({ limit, cursor });

  // Request one extra item to detect if more pages exist
  const response = await getV2Tasks({
    client,
    query: {
      limit: pagination.requestLimit,
      ...(pagination.offset !== undefined ? { offset: pagination.offset } : {}),
      ...(linkedObject ? { linked_object: linkedObject } : {}),
      ...(linkedRecordId ? { linked_record_id: linkedRecordId } : {}),
      ...(isCompleted !== undefined ? { is_completed: isCompleted } : {}),
    },
  });

  const { items: trimmedData, nextCursor } = resolveOffsetPagination({
    error: response.error,
    data: response.data?.data,
    pagination,
    errorMessage: "Failed to fetch tasks",
  });

  const tasks = trimmedData.map((task) => ({
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

  return {
    tasks,
    nextCursor,
  };
}
