import type { NavigatorCategory, ResultItem } from "./navigation.js";

// biome-ignore lint/style/noNamespace: Use a namespace to group column types and helpers.
export namespace Columns {
  export type EntityKey = string;

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
  ): EntityKey | undefined {
    if (!category) {
      return;
    }

    switch (category.type) {
      case "object":
        return `object-${category.objectSlug}`;
      case "list":
        return "list";
      case "notes":
      case "tasks":
      case "meetings":
      case "webhooks":
        return category.type;
    }
  }
}
