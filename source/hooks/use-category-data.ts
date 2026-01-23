import type { AttioClient } from "attio-ts-sdk";
import { useCallback } from "react";
import { fetchLists } from "../services/lists-service.js";
import { fetchMeetings } from "../services/meetings-service.js";
import { fetchNotes } from "../services/notes-service.js";
import { queryRecords } from "../services/objects-service.js";
import { fetchTasks } from "../services/tasks-service.js";
import { fetchWebhooks } from "../services/webhooks-service.js";
import type { DebugRequestLogEntryInput } from "../types/debug.js";
import type { ObjectSlug } from "../types/ids.js";
import type { NavigatorCategory, ResultItem } from "../types/navigation.js";
import {
  formatMeetingTime,
  getTaskSubtitle,
  truncateText,
} from "../utils/formatting.js";
import { getRecordSubtitle, getRecordTitle } from "../utils/record-values.js";
import { usePaginatedData } from "./use-paginated-data.js";

interface UseCategoryDataOptions {
  readonly client: AttioClient | undefined;
  readonly categoryType: NavigatorCategory["type"];
  readonly categorySlug?: ObjectSlug;
  readonly onRequestLog?: (entry: DebugRequestLogEntryInput) => void;
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

function getRequestLabel(
  categoryType: NavigatorCategory["type"],
  categorySlug?: ObjectSlug,
): string {
  if (categoryType === "object") {
    return `query records (${categorySlug ?? "object"})`;
  }
  if (categoryType === "list") {
    return "fetch lists";
  }
  return `fetch ${categoryType}`;
}

export function useCategoryData({
  client,
  categoryType,
  categorySlug,
  onRequestLog,
}: UseCategoryDataOptions): UseCategoryDataResult {
  const fetchData = useCallback(
    async (cursor?: string): Promise<CategoryDataPage> => {
      if (!client) {
        return { items: [], nextCursor: null };
      }

      const startTime = Date.now();
      const startedAt = new Date(startTime).toISOString();
      const detail = cursor ? `cursor ${cursor}` : "initial";

      try {
        switch (categoryType) {
          case "object": {
            if (!categorySlug) {
              return { items: [], nextCursor: null };
            }
            const result = await queryRecords(client, categorySlug, { cursor });
            const items: ResultItem[] = result.records.map((record) => ({
              type: "object",
              id: record.id,
              title: getRecordTitle(record.values),
              subtitle: getRecordSubtitle(record.values),
              data: record,
            }));
            const durationMs = Date.now() - startTime;
            onRequestLog?.({
              label: getRequestLabel(categoryType, categorySlug),
              status: "success",
              startedAt,
              durationMs,
              detail,
            });
            return {
              items,
              nextCursor: result.nextCursor,
            };
          }

          case "list": {
            const result = await fetchLists(client, { cursor });
            const items: ResultItem[] = result.lists.map((list) => ({
              type: "list",
              id: list.id,
              title: list.name,
              subtitle: `Parent: ${list.parentObject}`,
              data: list,
            }));
            const durationMs = Date.now() - startTime;
            onRequestLog?.({
              label: getRequestLabel(categoryType),
              status: "success",
              startedAt,
              durationMs,
              detail,
            });
            return { items, nextCursor: result.nextCursor };
          }

          case "notes": {
            const result = await fetchNotes(client, { cursor });
            const items: ResultItem[] = result.notes.map((note) => ({
              type: "notes",
              id: note.id,
              title: note.title || "Untitled Note",
              subtitle: truncateText(note.contentPlaintext, 50),
              data: note,
            }));
            const durationMs = Date.now() - startTime;
            onRequestLog?.({
              label: getRequestLabel(categoryType),
              status: "success",
              startedAt,
              durationMs,
              detail,
            });
            return { items, nextCursor: result.nextCursor };
          }

          case "tasks": {
            const result = await fetchTasks(client, { cursor });
            const items: ResultItem[] = result.tasks.map((task) => ({
              type: "tasks",
              id: task.id,
              title: truncateText(task.content, 50),
              subtitle: getTaskSubtitle(task),
              data: task,
            }));
            const durationMs = Date.now() - startTime;
            onRequestLog?.({
              label: getRequestLabel(categoryType),
              status: "success",
              startedAt,
              durationMs,
              detail,
            });
            return { items, nextCursor: result.nextCursor };
          }

          case "meetings": {
            const result = await fetchMeetings(client, { cursor });
            const items: ResultItem[] = result.meetings.map((meeting) => ({
              type: "meetings",
              id: meeting.id,
              title: meeting.title || "Untitled Meeting",
              subtitle: formatMeetingTime({
                startAt: meeting.startAt,
                endAt: meeting.endAt,
              }),
              data: meeting,
            }));
            const durationMs = Date.now() - startTime;
            onRequestLog?.({
              label: getRequestLabel(categoryType),
              status: "success",
              startedAt,
              durationMs,
              detail,
            });
            return { items, nextCursor: result.nextCursor };
          }

          case "webhooks": {
            const result = await fetchWebhooks(client, { cursor });
            const items: ResultItem[] = result.webhooks.map((webhook) => ({
              type: "webhooks",
              id: webhook.id,
              title: webhook.targetUrl,
              subtitle: `${webhook.status} - ${webhook.subscriptions.length} subscriptions`,
              data: webhook,
            }));
            const durationMs = Date.now() - startTime;
            onRequestLog?.({
              label: getRequestLabel(categoryType),
              status: "success",
              startedAt,
              durationMs,
              detail,
            });
            return { items, nextCursor: result.nextCursor };
          }

          default:
            return { items: [], nextCursor: null };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const durationMs = Date.now() - startTime;
        onRequestLog?.({
          label: getRequestLabel(categoryType, categorySlug),
          status: "error",
          startedAt,
          durationMs,
          detail,
          errorMessage: message,
        });
        throw err;
      }
    },
    [client, categoryType, categorySlug, onRequestLog],
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
