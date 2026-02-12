import { Text } from "ink";
import { render } from "ink-testing-library";
import { useEffect, useRef } from "react";
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
  const calledRef = useRef(false);

  useEffect(() => {
    if (!calledRef.current) {
      calledRef.current = true;
      drillIntoObject(object);
    }
  }, [drillIntoObject, object]);

  return <Text>harness</Text>;
}

async function waitForCondition(
  condition: () => boolean,
  timeoutMs = 2000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for condition");
}

describe("useObjectDrill", () => {
  it("dispatches OBJECT_DRILL_INTO_RECORDS with correct payload", async () => {
    const dispatch = vi.fn();

    const instance = render(
      <Harness dispatch={dispatch} object={testObject} />,
    );

    try {
      await waitForCondition(() => dispatch.mock.calls.length > 0);

      expect(dispatch).toHaveBeenCalledWith({
        type: "OBJECT_DRILL_INTO_RECORDS",
        objectSlug: parseObjectSlug("companies"),
        objectName: "Company",
      });
    } finally {
      instance.cleanup();
    }
  });

  it("falls back to apiSlug when singularNoun is null", async () => {
    const dispatch = vi.fn();
    const objectWithNullName: ObjectInfo = {
      ...testObject,
      singularNoun: null,
    };

    const instance = render(
      <Harness dispatch={dispatch} object={objectWithNullName} />,
    );

    try {
      await waitForCondition(() => dispatch.mock.calls.length > 0);

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
