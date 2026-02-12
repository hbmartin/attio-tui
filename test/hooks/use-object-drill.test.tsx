import { Text } from "ink";
import { render } from "ink-testing-library";
import { useCallback, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useObjectDrill } from "../../source/hooks/use-object-drill.js";
import type { AppAction } from "../../source/state/app-state.js";
import type { ObjectInfo } from "../../source/types/attio.js";
import { parseObjectSlug } from "../../source/types/ids.js";

const testObject: ObjectInfo = {
  id: "obj-1",
  apiSlug: "companies",
  singularNoun: "Company",
  pluralNoun: "Companies",
};

interface HarnessProps {
  readonly dispatch: React.Dispatch<AppAction>;
  readonly object: ObjectInfo;
}

function Harness({ dispatch, object }: HarnessProps) {
  const { drillIntoObject } = useObjectDrill({ dispatch });
  const [called, setCalled] = useState(false);

  const trigger = useCallback(() => {
    drillIntoObject(object);
    setCalled(true);
  }, [drillIntoObject, object]);

  // Call on first render via effect-like pattern
  if (!called) {
    trigger();
  }

  return <Text>{called ? "drilled" : "waiting"}</Text>;
}

describe("useObjectDrill", () => {
  it("dispatches OBJECT_DRILL_INTO_RECORDS with correct payload", () => {
    const dispatch = vi.fn();

    const instance = render(
      <Harness dispatch={dispatch} object={testObject} />,
    );

    try {
      expect(dispatch).toHaveBeenCalledWith({
        type: "OBJECT_DRILL_INTO_RECORDS",
        objectSlug: parseObjectSlug("companies"),
        objectName: "Company",
      });
    } finally {
      instance.cleanup();
    }
  });

  it("falls back to apiSlug when singularNoun is null", () => {
    const dispatch = vi.fn();
    const objectWithNullName: ObjectInfo = {
      ...testObject,
      singularNoun: null,
    };

    const instance = render(
      <Harness dispatch={dispatch} object={objectWithNullName} />,
    );

    try {
      expect(dispatch).toHaveBeenCalledWith({
        type: "OBJECT_DRILL_INTO_RECORDS",
        objectSlug: parseObjectSlug("companies"),
        objectName: "companies",
      });
    } finally {
      instance.cleanup();
    }
  });
});
