import type { AttioClient } from "attio-ts-sdk";
import { useCallback, useState } from "react";
import { findListStatusAttribute } from "../services/lists-service.js";
import type { AppAction } from "../state/app-state.js";
import type { ListInfo, StatusInfo } from "../types/attio.js";

interface UseListDrillOptions {
  readonly client: AttioClient | undefined;
  readonly dispatch: React.Dispatch<AppAction>;
}

interface UseListDrillResult {
  readonly isDrilling: boolean;
  readonly drillIntoList: (list: ListInfo) => void;
  readonly drillIntoStatus: (params: DrillIntoStatusParams) => void;
}

interface DrillIntoStatusParams {
  readonly listId: string;
  readonly listName: string;
  readonly statusAttributeSlug: string;
  readonly status: StatusInfo;
}

export function useListDrill({
  client,
  dispatch,
}: UseListDrillOptions): UseListDrillResult {
  const [isDrilling, setIsDrilling] = useState(false);

  const drillIntoList = useCallback(
    (list: ListInfo) => {
      if (!client || isDrilling) {
        return;
      }

      setIsDrilling(true);

      findListStatusAttribute(client, list.id)
        .then((statusAttr) => {
          if (statusAttr) {
            dispatch({
              type: "LIST_DRILL_INTO_STATUSES",
              listId: list.id,
              listName: list.name,
              statusAttributeSlug: statusAttr.slug,
            });
          } else {
            dispatch({
              type: "LIST_DRILL_INTO_ENTRIES",
              listId: list.id,
              listName: list.name,
            });
          }
        })
        .catch(() => {
          // On error, fall back to showing entries without status filter
          dispatch({
            type: "LIST_DRILL_INTO_ENTRIES",
            listId: list.id,
            listName: list.name,
          });
        })
        .finally(() => {
          setIsDrilling(false);
        });
    },
    [client, dispatch, isDrilling],
  );

  const drillIntoStatus = useCallback(
    ({
      listId,
      listName,
      statusAttributeSlug,
      status,
    }: DrillIntoStatusParams) => {
      dispatch({
        type: "LIST_DRILL_INTO_ENTRIES",
        listId,
        listName,
        statusId: status.statusId,
        statusTitle: status.title,
        statusAttributeSlug,
      });
    },
    [dispatch],
  );

  return { isDrilling, drillIntoList, drillIntoStatus };
}
