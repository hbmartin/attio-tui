import {
  COLUMN_DEFINITIONS,
  DEFAULT_COLUMNS,
} from "../constants/default-columns.js";
import type { ColumnConfig, ColumnsConfig } from "../schemas/columns-schema.js";
import { Columns } from "../types/columns.js";

function resolveEntityKey(
  entityKey: Columns.EntityKey | undefined,
): Columns.EntityKey {
  if (entityKey && COLUMN_DEFINITIONS[entityKey]) {
    return entityKey;
  }

  if (entityKey?.startsWith("object-")) {
    return Columns.DEFAULT_OBJECT_KEY;
  }

  return Columns.DEFAULT_OBJECT_KEY;
}

function resolveAvailableColumns(
  entityKey: Columns.EntityKey,
): readonly Columns.Definition[] {
  return (
    COLUMN_DEFINITIONS[entityKey] ??
    COLUMN_DEFINITIONS[Columns.DEFAULT_OBJECT_KEY] ??
    []
  );
}

function resolveConfiguredColumns(
  entityKey: Columns.EntityKey,
  columnsConfig: ColumnsConfig,
): readonly ColumnConfig[] {
  const configured = columnsConfig[entityKey];
  if (configured && configured.length > 0) {
    return configured;
  }

  const defaults = DEFAULT_COLUMNS[entityKey];
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
  const seen = new Set<string>();

  const resolved: Columns.ResolvedColumn[] = [];
  for (const config of configured) {
    const definition = byAttribute.get(config.attribute);
    if (definition && !seen.has(config.attribute)) {
      seen.add(config.attribute);
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
  return resolveAvailableColumns(resolveEntityKey(entityKey));
}

export function getColumnsConfig({
  entityKey,
  columnsConfig,
}: ColumnsConfigParams): readonly ColumnConfig[] {
  return resolveConfiguredColumns(resolveEntityKey(entityKey), columnsConfig);
}

export function resolveColumns({
  entityKey,
  columnsConfig,
}: ColumnsConfigParams): readonly Columns.ResolvedColumn[] {
  const key = resolveEntityKey(entityKey);
  const available = resolveAvailableColumns(key);
  const configured = resolveConfiguredColumns(key, columnsConfig);
  const resolved = applyConfig(available, configured);

  if (resolved.length > 0) {
    return resolved;
  }

  const fallbackConfigured = applyConfig(
    available,
    DEFAULT_COLUMNS[key] ?? DEFAULT_COLUMNS[Columns.DEFAULT_OBJECT_KEY] ?? [],
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
