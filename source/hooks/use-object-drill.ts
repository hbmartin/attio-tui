import { useCallback } from "react";
import type { AppAction } from "../state/app-state.js";
import type { ObjectInfo } from "../types/attio.js";
import { parseObjectSlug } from "../types/ids.js";

interface UseObjectDrillOptions {
  readonly dispatch: React.Dispatch<AppAction>;
}

interface UseObjectDrillResult {
  readonly drillIntoObject: (obj: ObjectInfo) => void;
}

export function useObjectDrill({
  dispatch,
}: UseObjectDrillOptions): UseObjectDrillResult {
  const drillIntoObject = useCallback(
    (obj: ObjectInfo) => {
      dispatch({
        type: "OBJECT_DRILL_INTO_RECORDS",
        objectSlug: parseObjectSlug(obj.apiSlug),
        objectName: obj.singularNoun ?? obj.apiSlug,
      });
    },
    [dispatch],
  );

  return { drillIntoObject };
}
