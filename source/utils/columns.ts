import {
  COLUMN_DEFINITIONS,
  DEFAULT_COLUMNS,
} from "../constants/default-columns.js";
import type { ColumnConfig, ColumnsConfig } from "../schemas/columns-schema.js";
import { Columns } from "../types/columns.js";

function resolveEntityKey(entityKey: Columns.EntityKey | undefined): string {
  if (entityKey && COLUMN_DEFINITIONS[entityKey]) {
    return entityKey;
  }

  if (entityKey?.startsWith("object-")) {
    return Columns.DEFAULT_OBJECT_KEY;
  }

  return entityKey ?? Columns.DEFAULT_OBJECT_KEY;
}

function resolveAvailableColumns(
  entityKey: Columns.EntityKey | undefined,
): readonly Columns.Definition[] {
  const key = resolveEntityKey(entityKey);
  return (
    COLUMN_DEFINITIONS[key] ??
    COLUMN_DEFINITIONS[Columns.DEFAULT_OBJECT_KEY] ??
    []
  );
}

function resolveConfiguredColumns(
  entityKey: Columns.EntityKey | undefined,
  columnsConfig: ColumnsConfig,
): readonly ColumnConfig[] {
  const key = resolveEntityKey(entityKey);
  const configured = columnsConfig[key];
  if (configured && configured.length > 0) {
    return configured;
  }

  const defaults = DEFAULT_COLUMNS[key];
  if (defaults && defaults.length > 0) {
    return defaults;
  }

  return DEFAULT_COLUMNS[Columns.DEFAULT_OBJECT_KEY] ?? [];
}

function applyConfig(
  definitions: readonly Columns.Definition[],
  configured: readonly ColumnConfig[],
): readonly Columns.ResolvedColumn[] {
  const byAttribute = new Map(
    definitions.map((definition) => [definition.attribute, definition]),
  );

  const resolved: Columns.ResolvedColumn[] = [];
  for (const config of configured) {
    const definition = byAttribute.get(config.attribute);
    if (definition) {
      const label = config.label ?? definition.label;
      const width = Math.max(config.width ?? definition.width, label.length, 1);
      resolved.push({
        attribute: definition.attribute,
        label,
        width,
        value: definition.value,
      });
    }
  }

  return resolved;
}

export interface ColumnsConfigParams {
  readonly entityKey: Columns.EntityKey | undefined;
  readonly columnsConfig: ColumnsConfig;
}

export interface ColumnsEntityParams {
  readonly entityKey: Columns.EntityKey | undefined;
}

export function getAvailableColumns({
  entityKey,
}: ColumnsEntityParams): readonly Columns.Definition[] {
  return resolveAvailableColumns(entityKey);
}

export function getColumnsConfig({
  entityKey,
  columnsConfig,
}: ColumnsConfigParams): readonly ColumnConfig[] {
  return resolveConfiguredColumns(entityKey, columnsConfig);
}

export function resolveColumns({
  entityKey,
  columnsConfig,
}: ColumnsConfigParams): readonly Columns.ResolvedColumn[] {
  const available = resolveAvailableColumns(entityKey);
  const configured = resolveConfiguredColumns(entityKey, columnsConfig);
  const resolved = applyConfig(available, configured);

  if (resolved.length > 0) {
    return resolved;
  }

  const fallbackConfigured = applyConfig(
    available,
    DEFAULT_COLUMNS[resolveEntityKey(entityKey)] ??
      DEFAULT_COLUMNS[Columns.DEFAULT_OBJECT_KEY] ??
      [],
  );

  if (fallbackConfigured.length > 0) {
    return fallbackConfigured;
  }

  return available.map((definition) => ({
    attribute: definition.attribute,
    label: definition.label,
    width: Math.max(definition.width, definition.label.length, 1),
    value: definition.value,
  }));
}

export function getDefaultColumns({
  entityKey,
}: ColumnsEntityParams): readonly ColumnConfig[] {
  const key = resolveEntityKey(entityKey);
  return (
    DEFAULT_COLUMNS[key] ?? DEFAULT_COLUMNS[Columns.DEFAULT_OBJECT_KEY] ?? []
  );
}
