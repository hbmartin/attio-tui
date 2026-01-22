import type { AttioClient } from "attio-ts-sdk";
import { useCallback } from "react";
import { fetchLists } from "../services/lists-service.js";
import { fetchMeetings } from "../services/meetings-service.js";
import { fetchNotes } from "../services/notes-service.js";
import { queryRecords } from "../services/objects-service.js";
import { fetchTasks } from "../services/tasks-service.js";
import { fetchWebhooks } from "../services/webhooks-service.js";
import { parseObjectSlug } from "../types/ids.js";
import type { ResultItem } from "../types/navigation.js";
import { usePaginatedData } from "./use-paginated-data.js";

interface UseCategoryDataOptions {
  readonly client: AttioClient | undefined;
  readonly categoryType: string;
  readonly categorySlug?: string;
}

interface UseCategoryDataResult {
  readonly items: readonly ResultItem[];
  readonly loading: boolean;
  readonly error: string | undefined;
  readonly hasNextPage: boolean;
  readonly loadMore: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

interface CategoryDataPage {
  readonly items: readonly ResultItem[];
  readonly nextCursor: string | null;
}

export function useCategoryData({
  client,
  categoryType,
  categorySlug,
}: UseCategoryDataOptions): UseCategoryDataResult {
  const fetchData = useCallback(
    async (cursor?: string): Promise<CategoryDataPage> => {
      if (!client) {
        return { items: [], nextCursor: null };
      }

      switch (categoryType) {
        case "object": {
          if (!categorySlug) {
            return { items: [], nextCursor: null };
          }
          const result = await queryRecords(
            client,
            parseObjectSlug(categorySlug),
            { cursor },
          );
          return {
            items: result.records.map((record) => ({
              id: record.id,
              title: getRecordTitle(record.values),
              subtitle: getRecordSubtitle(record.values),
              data: record,
            })),
            nextCursor: result.nextCursor,
          };
        }

        case "list": {
          // Lists use the lists service
          const lists = await fetchLists(client);
          return {
            items: lists.map((list) => ({
              id: list.id,
              title: list.name,
              subtitle: `Parent: ${list.parentObject}`,
              data: list,
            })),
            nextCursor: null,
          };
        }

        case "notes": {
          const result = await fetchNotes(client, { cursor });
          return {
            items: result.notes.map((note) => ({
              id: note.id,
              title: note.title || "Untitled Note",
              subtitle: truncateText(note.contentPlaintext, 50),
              data: note,
            })),
            nextCursor: result.nextCursor,
          };
        }

        case "tasks": {
          const result = await fetchTasks(client, { cursor });
          return {
            items: result.tasks.map((task) => ({
              id: task.id,
              title: truncateText(task.content, 50),
              subtitle: getTaskSubtitle(task),
              data: task,
            })),
            nextCursor: result.nextCursor,
          };
        }

        case "meetings": {
          const result = await fetchMeetings(client, { cursor });
          return {
            items: result.meetings.map((meeting) => ({
              id: meeting.id,
              title: meeting.title || "Untitled Meeting",
              subtitle: formatMeetingTime(meeting.startAt, meeting.endAt),
              data: meeting,
            })),
            nextCursor: result.nextCursor,
          };
        }

        case "webhooks": {
          const webhooks = await fetchWebhooks(client);
          return {
            items: webhooks.map((webhook) => ({
              id: webhook.id,
              title: webhook.targetUrl,
              subtitle: `${webhook.status} - ${webhook.subscriptions.length} subscriptions`,
              data: webhook,
            })),
            nextCursor: null,
          };
        }

        default:
          return { items: [], nextCursor: null };
      }
    },
    [client, categoryType, categorySlug],
  );

  const { data, loading, error, hasNextPage, loadMore, refresh } =
    usePaginatedData<ResultItem>({
      fetchFn: fetchData,
      enabled: Boolean(client),
    });

  return {
    items: data,
    loading,
    error,
    hasNextPage,
    loadMore,
    refresh,
  };
}

// Helper functions
function getRecordTitle(values: Record<string, unknown>): string {
  const nameFields = [
    "name",
    "full_name",
    "title",
    "first_name",
    "company_name",
  ];
  for (const field of nameFields) {
    const fieldValues = values[field];
    if (Array.isArray(fieldValues) && fieldValues.length > 0) {
      const firstValue = fieldValues[0] as Record<string, unknown>;
      if (firstValue && "value" in firstValue) {
        return String(firstValue["value"]);
      }
    }
  }
  return "Unnamed";
}

function getRecordSubtitle(values: Record<string, unknown>): string {
  const subtitleFields = [
    "email_addresses",
    "domains",
    "description",
    "job_title",
  ];
  for (const field of subtitleFields) {
    const fieldValues = values[field];
    if (Array.isArray(fieldValues) && fieldValues.length > 0) {
      const firstValue = fieldValues[0] as Record<string, unknown>;
      if (firstValue) {
        if ("email_address" in firstValue) {
          return String(firstValue["email_address"]);
        }
        if ("domain" in firstValue) {
          return String(firstValue["domain"]);
        }
        if ("value" in firstValue) {
          return String(firstValue["value"]);
        }
      }
    }
  }
  return "";
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

function formatDeadline(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function formatMeetingTime(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const dateStr = start.toLocaleDateString();
  const startTime = start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} ${startTime} - ${endTime}`;
}

function getTaskSubtitle(task: {
  isCompleted: boolean;
  deadlineAt: string | null;
}): string {
  if (task.isCompleted) {
    return "Completed";
  }
  if (task.deadlineAt) {
    return `Due: ${formatDeadline(task.deadlineAt)}`;
  }
  return "No deadline";
}
