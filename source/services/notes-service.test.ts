import {
  createAttioClient,
  type GetV2NotesResponses,
  getV2Notes,
} from "attio-ts-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchNotes } from "./notes-service.js";

vi.mock("attio-ts-sdk", async () => {
  const actual =
    await vi.importActual<typeof import("attio-ts-sdk")>("attio-ts-sdk");

  return {
    ...actual,
    getV2Notes: vi.fn(),
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

const buildNote = (
  noteId: string,
): GetV2NotesResponses[200]["data"][number] => ({
  id: {
    workspace_id: "workspace-1",
    note_id: noteId,
  },
  parent_object: "companies",
  parent_record_id: "record-1",
  title: "Note title",
  meeting_id: null,
  content_plaintext: "Note content",
  content_markdown: "Note content",
  tags: [],
  created_by_actor: {},
  created_at: "2025-01-01T00:00:00Z",
});

describe("fetchNotes", () => {
  const client = createAttioClient({
    apiKey: "at_0123456789abcdef0123456789abcdef0123456789abcdef",
  });
  const mockGetV2Notes = vi.mocked(getV2Notes);

  beforeEach(() => {
    mockGetV2Notes.mockReset();
  });

  it("falls back to offset 0 for non-numeric cursors", async () => {
    mockGetV2Notes.mockResolvedValue(
      buildSuccess({ data: [buildNote("note-1"), buildNote("note-2")] }),
    );

    const result = await fetchNotes(client, { cursor: "nope", limit: 2 });

    expect(mockGetV2Notes).toHaveBeenCalledWith({
      client,
      query: { limit: 2, offset: 0 },
    });
    expect(result.nextCursor).toBe("2");
  });

  it("uses numeric cursor offsets when valid", async () => {
    mockGetV2Notes.mockResolvedValue(
      buildSuccess({ data: [buildNote("note-3")] }),
    );

    const result = await fetchNotes(client, { cursor: "3", limit: 1 });

    expect(mockGetV2Notes).toHaveBeenCalledWith({
      client,
      query: { limit: 1, offset: 3 },
    });
    expect(result.nextCursor).toBe("4");
  });
});
