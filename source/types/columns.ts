import type {
  NavigatorCategory,
  ObjectDrillState,
  ResultItem,
} from "./navigation.js";

// biome-ignore lint/style/noNamespace: Use a namespace to group column types and helpers.
export namespace Columns {
  export type KnownEntityKey =
    | "object-default"
    | "object-companies"
    | "object-people"
    | "objects"
    | "list"
    | "notes"
    | "tasks"
    | "meetings"
    | "webhooks";

  export type EntityKey = KnownEntityKey | `object-${string}`;

  export const DEFAULT_OBJECT_KEY = "object-default";

  export interface Definition {
    readonly attribute: string;
    readonly label: string;
    readonly width: number;
    readonly value: (item: ResultItem) => string;
  }

  export interface ResolvedColumn {
    readonly attribute: string;
    readonly label: string;
    readonly width: number;
    readonly value: (item: ResultItem) => string;
  }

  export function getEntityKey(
    category: NavigatorCategory | undefined,
    objectDrill?: ObjectDrillState,
  ): EntityKey | undefined {
    if (!category) {
      return;
    }

    switch (category.type) {
      case "object":
        return `object-${category.objectSlug}`;
      case "list":
      case "lists":
        return "list";
      case "objects":
        // When drilled into a specific object's records, use that object's key
        if (objectDrill?.level === "records") {
          return `object-${objectDrill.objectSlug}`;
        }
        return "objects";
      case "notes":
      case "tasks":
      case "meetings":
      case "webhooks":
        return category.type;
    }
  }
}
