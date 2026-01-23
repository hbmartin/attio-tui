import process from "node:process";
import type { AttioClient } from "attio-ts-sdk";
import { createAttioClient } from "attio-ts-sdk";
import { Text } from "ink";
import { render } from "ink-testing-library";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryListsResult } from "../services/lists-service.js";
import { fetchLists } from "../services/lists-service.js";
import type { QueryNotesResult } from "../services/notes-service.js";
import { fetchNotes } from "../services/notes-service.js";
import { queryRecords } from "../services/objects-service.js";
import type { ListInfo, NoteInfo, RecordValue } from "../types/attio.js";
import { type ObjectSlug, parseObjectSlug } from "../types/ids.js";
import type { NavigatorCategory, ResultItem } from "../types/navigation.js";
import { useCategoryData } from "./use-category-data.js";

vi.mock("../services/lists-service.js", () => ({
  fetchLists: vi.fn(),
}));

vi.mock("../services/meetings-service.js", () => ({
  fetchMeetings: vi.fn(),
}));

vi.mock("../services/notes-service.js", () => ({
  fetchNotes: vi.fn(),
}));

vi.mock("../services/objects-service.js", () => ({
  queryRecords: vi.fn(),
}));

vi.mock("../services/tasks-service.js", () => ({
  fetchTasks: vi.fn(),
}));

vi.mock("../services/webhooks-service.js", () => ({
  fetchWebhooks: vi.fn(),
}));

interface WaitForOptions {
  readonly timeoutMs?: number;
  readonly intervalMs?: number;
}

const baseRecordValue = {
  active_from: "2025-01-01T00:00:00Z",
  active_until: null,
  created_by_actor: {},
};

function textRecordValue(value: string): RecordValue {
  return {
    ...baseRecordValue,
    attribute_type: "text",
    value,
  };
}

async function waitForCondition(
  condition: () => boolean,
  options: WaitForOptions = {},
): Promise<void> {
  const { timeoutMs = 2000, intervalMs = 25 } = options;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for hook state to update");
}

interface CategoryOptions {
  readonly client: AttioClient | undefined;
  readonly categoryType: NavigatorCategory["type"];
  readonly categorySlug?: ObjectSlug;
}

interface CategorySnapshot {
  readonly items: readonly ResultItem[];
  readonly loading: boolean;
  readonly error: string | undefined;
  readonly hasNextPage: boolean;
  readonly loadMore: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

interface CategoryHarnessProps {
  readonly options: CategoryOptions;
  readonly onUpdate: (snapshot: CategorySnapshot) => void;
}

function CategoryHarness({
  options,
  onUpdate,
}: CategoryHarnessProps): JSX.Element {
  const snapshot = useCategoryData(options);

  useEffect(() => {
    onUpdate(snapshot);
  }, [snapshot, onUpdate]);

  const titles = snapshot.items.map((item) => item.title).join("|");
  const loadingLabel = snapshot.loading ? "loading" : "idle";
  const errorLabel = snapshot.error ? `error:${snapshot.error}` : "error:none";
  const nextLabel = snapshot.hasNextPage ? "next" : "end";

  return <Text>{[titles, loadingLabel, errorLabel, nextLabel].join("|")}</Text>;
}

const mockFetchLists = vi.mocked(fetchLists);
const mockFetchNotes = vi.mocked(fetchNotes);
const mockQueryRecords = vi.mocked(queryRecords);

const TEST_API_KEY = process.env["TEST_API_KEY"] ?? "test-api-key-placeholder";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useCategoryData", () => {
  it("loads list items and maps display fields", async () => {
    const client = createAttioClient({ apiKey: TEST_API_KEY });
    const lists: readonly ListInfo[] = [
      {
        id: "list-1",
        apiSlug: "growth",
        name: "Growth Prospects",
        parentObject: "companies",
      },
    ];

    const listResult: QueryListsResult = {
      lists,
      nextCursor: null,
    };

    mockFetchLists.mockResolvedValueOnce(listResult);

    let latest: CategorySnapshot | undefined;

    const instance = render(
      <CategoryHarness
        options={{ client, categoryType: "list" }}
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(
        () => Boolean(latest) && latest?.items.length === 1,
      );

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      expect(latest.loading).toBe(false);
      expect(latest.error).toBeUndefined();
      expect(latest.items[0]?.title).toBe("Growth Prospects");
      expect(latest.items[0]?.subtitle).toBe("Parent: companies");
      expect(latest.hasNextPage).toBe(false);
      expect(mockFetchLists).toHaveBeenCalledWith(client, {
        cursor: undefined,
      });
    } finally {
      instance.cleanup();
    }
  });

  it("paginates notes and supports refresh", async () => {
    const client = createAttioClient({ apiKey: TEST_API_KEY });
    const noteA: NoteInfo = {
      id: "note-1",
      parentObject: "companies",
      parentRecordId: "record-1",
      title: "First Note",
      contentPlaintext: "Short content",
      createdAt: "2025-01-01T00:00:00Z",
      createdByType: "workspace-member",
      createdById: "user-1",
    };
    const noteB: NoteInfo = {
      id: "note-2",
      parentObject: "companies",
      parentRecordId: "record-2",
      title: "Second Note",
      contentPlaintext: "More content",
      createdAt: "2025-01-02T00:00:00Z",
      createdByType: "workspace-member",
      createdById: "user-2",
    };

    const firstPage: QueryNotesResult = {
      notes: [noteA],
      nextCursor: "25",
    };

    const secondPage: QueryNotesResult = {
      notes: [noteB],
      nextCursor: null,
    };

    mockFetchNotes
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage)
      .mockResolvedValueOnce(firstPage);

    let latest: CategorySnapshot | undefined;

    const instance = render(
      <CategoryHarness
        options={{ client, categoryType: "notes" }}
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(
        () => Boolean(latest) && latest?.items.length === 1,
      );

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      expect(latest.items[0]?.title).toBe("First Note");
      expect(latest.items[0]?.subtitle).toBe("Short content");
      expect(latest.hasNextPage).toBe(true);

      await latest.loadMore();

      await waitForCondition(() => latest?.items.length === 2);

      expect(latest.items[1]?.title).toBe("Second Note");
      expect(latest.hasNextPage).toBe(false);

      await latest.refresh();

      await waitForCondition(
        () => latest?.items.length === 1 && latest.items[0]?.id === "note-1",
      );

      expect(latest.items[0]?.title).toBe("First Note");
      expect(latest.hasNextPage).toBe(true);
      expect(mockFetchNotes).toHaveBeenCalledTimes(3);
    } finally {
      instance.cleanup();
    }
  });

  it("queries object records with branded slugs", async () => {
    const client = createAttioClient({ apiKey: TEST_API_KEY });
    const objectSlug = parseObjectSlug("companies");

    mockQueryRecords.mockResolvedValueOnce({
      records: [
        {
          id: "record-1",
          objectId: "object-1",
          values: {
            name: [textRecordValue("Acme Corp")],
          },
          createdAt: "2025-01-01T00:00:00Z",
        },
      ],
      nextCursor: null,
    });

    let latest: CategorySnapshot | undefined;

    const instance = render(
      <CategoryHarness
        options={{ client, categoryType: "object", categorySlug: objectSlug }}
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(
        () => Boolean(latest) && latest?.items.length === 1,
      );

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      expect(latest.items[0]?.title).toBe("Acme Corp");
      expect(latest.hasNextPage).toBe(false);
      expect(mockQueryRecords).toHaveBeenCalledWith(client, objectSlug, {
        cursor: undefined,
      });
    } finally {
      instance.cleanup();
    }
  });

  it("reports errors from fetches", async () => {
    const client = createAttioClient({ apiKey: TEST_API_KEY });

    mockFetchNotes.mockRejectedValueOnce(new Error("Boom"));

    let latest: CategorySnapshot | undefined;

    const instance = render(
      <CategoryHarness
        options={{ client, categoryType: "notes" }}
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(() => latest?.error === "Boom");

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      expect(latest.items).toHaveLength(0);
      expect(latest.loading).toBe(false);
      expect(latest.error).toBe("Boom");
    } finally {
      instance.cleanup();
    }
  });

  it("skips fetching when the client is missing", async () => {
    const options = {
      client: undefined,
      categoryType: "list",
    } satisfies CategoryOptions;

    let latest: CategorySnapshot | undefined;

    const instance = render(
      <CategoryHarness
        options={options}
        onUpdate={(snapshot) => {
          latest = snapshot;
        }}
      />,
    );

    try {
      await waitForCondition(() => Boolean(latest));

      if (!latest) {
        throw new Error("Expected hook state to be available");
      }

      expect(latest.items).toHaveLength(0);
      expect(latest.loading).toBe(false);
      expect(latest.error).toBeUndefined();
      expect(latest.hasNextPage).toBe(false);
      expect(mockFetchLists).not.toHaveBeenCalled();
    } finally {
      instance.cleanup();
    }
  });
});
