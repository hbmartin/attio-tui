import type { AttioClient } from "attio-ts-sdk";
import { createListId } from "attio-ts-sdk";
import { useCallback } from "react";
import {
  buildStatusFilter,
  fetchListStatuses,
  fetchLists,
  queryListEntries,
} from "../services/lists-service.js";
import { fetchMeetings } from "../services/meetings-service.js";
import { fetchNotes } from "../services/notes-service.js";
import { queryRecords } from "../services/objects-service.js";
import { fetchTasks } from "../services/tasks-service.js";
import { fetchWebhooks } from "../services/webhooks-service.js";
import type { DebugRequestLogEntryInput } from "../types/debug.js";
import type { ObjectSlug } from "../types/ids.js";
import type {
  ListDrillState,
  NavigatorCategory,
  ResultItem,
} from "../types/navigation.js";
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
  readonly listDrill?: ListDrillState;
  readonly onRequestLog?: (entry: DebugRequestLogEntryInput) => void;
}

interface UseCategoryDataResult {
  readonly items: readonly ResultItem[];
  readonly loading: boolean;
  readonly error: string | undefined;
  readonly hasNextPage: boolean;
  readonly lastUpdatedAt: Date | undefined;
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
  listDrill?: ListDrillState,
): string {
  if (categoryType === "object") {
    return `query records (${categorySlug ?? "object"})`;
  }
  if (categoryType === "list") {
    return "fetch lists";
  }
  if (categoryType === "lists" && listDrill) {
    if (listDrill.level === "statuses") {
      return `fetch statuses (${listDrill.listName})`;
    }
    if (listDrill.level === "entries") {
      return `query entries (${listDrill.listName})`;
    }
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

function computeResetKey(
  categoryType: NavigatorCategory["type"],
  categorySlug?: ObjectSlug,
  listDrill?: ListDrillState,
): string {
  if (categoryType === "object") {
    return `object:${categorySlug ?? "unknown"}`;
  }
  if (categoryType === "lists" && listDrill) {
    if (listDrill.level === "statuses") {
      return `lists:${listDrill.listId}:statuses`;
    }
    if (listDrill.level === "entries") {
      return `lists:${listDrill.listId}:entries:${listDrill.statusId ?? "all"}`;
    }
  }
  return categoryType;
}

export function useCategoryData({
  client,
  categoryType,
  categorySlug,
  listDrill,
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
      const requestLabel = getRequestLabel(
        categoryType,
        categorySlug,
        listDrill,
      );
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

          case "lists": {
            if (!listDrill || listDrill.level === "lists") {
              // Top level: show all lists
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
            } else if (listDrill.level === "statuses") {
              // Show statuses for the selected list
              const statuses = await fetchListStatuses(
                client,
                listDrill.listId,
                listDrill.statusAttributeSlug,
              );
              items = statuses
                .filter((s) => !s.isArchived)
                .map((status) => ({
                  type: "list-status" as const,
                  id: status.statusId,
                  title: status.title,
                  subtitle: status.celebrationEnabled
                    ? "Celebration enabled"
                    : undefined,
                  data: status,
                }));
              nextCursor = null;
            } else {
              // Show entries for the selected list, optionally filtered by status
              const filter =
                listDrill.statusId && listDrill.statusAttributeSlug
                  ? buildStatusFilter(
                      listDrill.statusAttributeSlug,
                      listDrill.statusId,
                    )
                  : undefined;
              const { entries, nextCursor: nc } = await queryListEntries(
                client,
                createListId(listDrill.listId),
                { cursor, filter },
              );
              items = entries.map((entry) => ({
                type: "list-entry" as const,
                id: entry.id,
                title: entry.parentRecordId,
                subtitle: `Entry in ${listDrill.listName}`,
                data: entry,
              }));
              nextCursor = nc;
            }
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
        throw new Error(message, { cause: err });
      }
    },
    [client, categoryType, categorySlug, listDrill, onRequestLog],
  );

  const resetKey = computeResetKey(categoryType, categorySlug, listDrill);

  const {
    data,
    loading,
    error,
    hasNextPage,
    lastUpdatedAt,
    loadMore,
    refresh,
    checkPrefetch,
  } = usePaginatedData<ResultItem>({
    fetchFn: fetchData,
    enabled: Boolean(client),
    resetKey,
    loadMoreCooldownMs: 1500,
  });

  return {
    items: data,
    loading,
    error,
    hasNextPage,
    lastUpdatedAt,
    loadMore,
    refresh,
    checkPrefetch,
  };
}
