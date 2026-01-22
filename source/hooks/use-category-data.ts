import type { AttioClient } from "attio-ts-sdk";
import { useCallback } from "react";
import { fetchLists } from "../services/lists-service.js";
import { fetchMeetings } from "../services/meetings-service.js";
import { fetchNotes } from "../services/notes-service.js";
import { queryRecords } from "../services/objects-service.js";
import { fetchTasks } from "../services/tasks-service.js";
import { fetchWebhooks } from "../services/webhooks-service.js";
import { getRecordSubtitle, getRecordTitle } from "../types/entities.js";
import type { ObjectSlug } from "../types/ids.js";
import type { NavigatorCategory, ResultItem } from "../types/navigation.js";
import {
  formatMeetingTime,
  getTaskSubtitle,
  truncateText,
} from "../utils/formatting.js";
import { usePaginatedData } from "./use-paginated-data.js";

interface UseCategoryDataOptions {
  readonly client: AttioClient | undefined;
  readonly categoryType: NavigatorCategory["type"];
  readonly categorySlug?: ObjectSlug;
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
          const result = await queryRecords(client, categorySlug, { cursor });
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
          const result = await fetchLists(client, { cursor });
          return {
            items: result.lists.map((list) => ({
              id: list.id,
              title: list.name,
              subtitle: `Parent: ${list.parentObject}`,
              data: list,
            })),
            nextCursor: result.nextCursor,
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
          const result = await fetchWebhooks(client, { cursor });
          return {
            items: result.webhooks.map((webhook) => ({
              id: webhook.id,
              title: webhook.targetUrl,
              subtitle: `${webhook.status} - ${webhook.subscriptions.length} subscriptions`,
              data: webhook,
            })),
            nextCursor: result.nextCursor,
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
