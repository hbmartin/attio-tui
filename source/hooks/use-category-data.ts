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
import { extractErrorMessage } from "../utils/error-messages.js";
import {
  formatMeetingTime,
  getTaskSubtitle,
  truncateText,
} from "../utils/formatting.js";
import { PtyDebug } from "../utils/pty-debug.js";
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
  readonly checkPrefetch: (selectedIndex: number) => void;
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

function safeLog(
  onRequestLog: ((entry: DebugRequestLogEntryInput) => void) | undefined,
  entry: DebugRequestLogEntryInput,
): void {
  if (!onRequestLog) {
    return;
  }
  try {
    onRequestLog(entry);
  } catch {
    // Logging failures should not break data fetches
  }
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
      const requestLabel = getRequestLabel(categoryType, categorySlug);
      PtyDebug.log(`request start label="${requestLabel}" detail=${detail}`);

      try {
        let items: ResultItem[];
        let nextCursor: string | null;

        switch (categoryType) {
          case "object": {
            if (!categorySlug) {
              return { items: [], nextCursor: null };
            }
            const { records, nextCursor: nc } = await queryRecords(
              client,
              categorySlug,
              { cursor },
            );
            items = records.map((record) => ({
              type: "object",
              id: record.id,
              title: getRecordTitle(record.values),
              subtitle: getRecordSubtitle(record.values),
              data: record,
            }));
            nextCursor = nc;
            break;
          }

          case "list": {
            const { lists, nextCursor: nc } = await fetchLists(client, {
              cursor,
            });
            items = lists.map((list) => ({
              type: "list",
              id: list.id,
              title: list.name,
              subtitle: `Parent: ${list.parentObject}`,
              data: list,
            }));
            nextCursor = nc;
            break;
          }

          case "notes": {
            const { notes, nextCursor: nc } = await fetchNotes(client, {
              cursor,
            });
            items = notes.map((note) => ({
              type: "notes",
              id: note.id,
              title: note.title || "Untitled Note",
              subtitle: truncateText(note.contentPlaintext, 50),
              data: note,
            }));
            nextCursor = nc;
            break;
          }

          case "tasks": {
            const { tasks, nextCursor: nc } = await fetchTasks(client, {
              cursor,
            });
            items = tasks.map((task) => ({
              type: "tasks",
              id: task.id,
              title: truncateText(task.content, 50),
              subtitle: getTaskSubtitle(task),
              data: task,
            }));
            nextCursor = nc;
            break;
          }

          case "meetings": {
            const { meetings, nextCursor: nc } = await fetchMeetings(client, {
              cursor,
            });
            items = meetings.map((meeting) => ({
              type: "meetings",
              id: meeting.id,
              title: meeting.title || "Untitled Meeting",
              subtitle: formatMeetingTime({
                startAt: meeting.startAt,
                endAt: meeting.endAt,
              }),
              data: meeting,
            }));
            nextCursor = nc;
            break;
          }

          case "webhooks": {
            const { webhooks, nextCursor: nc } = await fetchWebhooks(client, {
              cursor,
            });
            items = webhooks.map((webhook) => ({
              type: "webhooks",
              id: webhook.id,
              title: webhook.targetUrl,
              subtitle: `${webhook.status} - ${webhook.subscriptions.length} subscriptions`,
              data: webhook,
            }));
            nextCursor = nc;
            break;
          }

          default:
            return { items: [], nextCursor: null };
        }

        const durationMs = Date.now() - startTime;
        safeLog(onRequestLog, {
          label: requestLabel,
          status: "success",
          startedAt,
          durationMs,
          detail,
        });
        PtyDebug.log(
          `request success label="${requestLabel}" durationMs=${durationMs}`,
        );
        return { items, nextCursor };
      } catch (err) {
        const message = extractErrorMessage(err);
        const durationMs = Date.now() - startTime;
        safeLog(onRequestLog, {
          label: requestLabel,
          status: "error",
          startedAt,
          durationMs,
          detail,
          errorMessage: message,
        });
        PtyDebug.log(
          `request error label="${requestLabel}" durationMs=${durationMs} message="${message}"`,
        );
        // Re-throw with improved message for display
        const displayError = new Error(message);
        displayError.cause = err;
        throw displayError;
      }
    },
    [client, categoryType, categorySlug, onRequestLog],
  );

  const {
    data,
    loading,
    error,
    hasNextPage,
    loadMore,
    refresh,
    checkPrefetch,
  } = usePaginatedData<ResultItem>({
    fetchFn: fetchData,
    enabled: Boolean(client),
    resetKey:
      categoryType === "object"
        ? `object:${categorySlug ?? "unknown"}`
        : categoryType,
    loadMoreCooldownMs: 1500,
  });

  return {
    items: data,
    loading,
    error,
    hasNextPage,
    loadMore,
    refresh,
    checkPrefetch,
  };
}
