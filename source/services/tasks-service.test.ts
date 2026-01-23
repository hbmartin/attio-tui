import {
  createAttioClient,
  type GetV2TasksResponses,
  getV2Tasks,
} from "attio-ts-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTasks } from "./tasks-service.js";

vi.mock("attio-ts-sdk", async () => {
  const actual =
    await vi.importActual<typeof import("attio-ts-sdk")>("attio-ts-sdk");

  return {
    ...actual,
    getV2Tasks: vi.fn(),
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

const buildTask = (
  taskId: string,
): GetV2TasksResponses[200]["data"][number] => ({
  id: {
    workspace_id: "workspace-1",
    task_id: taskId,
  },
  content_plaintext: "Task content",
  deadline_at: null,
  is_completed: false,
  linked_records: [],
  assignees: [],
  created_by_actor: {},
  created_at: "2025-01-01T00:00:00Z",
});

describe("fetchTasks", () => {
  const client = createAttioClient({
    apiKey: "at_0123456789abcdef0123456789abcdef0123456789abcdef",
  });
  const mockGetV2Tasks = vi.mocked(getV2Tasks);

  beforeEach(() => {
    mockGetV2Tasks.mockReset();
  });

  it("drops invalid cursors and normalizes non-positive limits", async () => {
    mockGetV2Tasks.mockResolvedValue(
      buildSuccess({ data: [buildTask("task-1")] }),
    );

    const result = await fetchTasks(client, { cursor: "bad", limit: 0 });

    // Uses limit+1 strategy: requests 26 to detect if there are more pages
    expect(mockGetV2Tasks).toHaveBeenCalledWith({
      client,
      query: { limit: 26 },
    });
    expect(result.nextCursor).toBeNull();
  });

  it("uses parsed offsets when computing nextCursor with limit+1 strategy", async () => {
    // Return 3 tasks (limit+1) to trigger hasMore detection
    mockGetV2Tasks.mockResolvedValue(
      buildSuccess({
        data: [buildTask("task-2"), buildTask("task-3"), buildTask("task-4")],
      }),
    );

    const result = await fetchTasks(client, { cursor: "10", limit: 2 });

    // Uses limit+1 strategy: requests 3 to detect if there are more pages
    expect(mockGetV2Tasks).toHaveBeenCalledWith({
      client,
      query: { limit: 3, offset: 10 },
    });
    // Returns only the first 2 tasks (effectiveLimit)
    expect(result.tasks).toHaveLength(2);
    // nextCursor is offset (10) + effectiveLimit (2) = 12
    expect(result.nextCursor).toBe("12");
  });
});
