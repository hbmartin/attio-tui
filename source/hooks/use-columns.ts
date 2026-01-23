import { existsSync, promises as fs, mkdirSync, readFileSync } from "node:fs";
import process from "node:process";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_COLUMNS } from "../constants/default-columns.js";
import {
  type ColumnConfig,
  type ColumnsConfig,
  ColumnsConfigSchema,
} from "../schemas/columns-schema.js";
import type { Columns } from "../types/columns.js";
import { getColumnsPath, getConfigDir } from "../utils/config-path.js";

interface UseColumnsResult {
  readonly columns: ColumnsConfig;
  readonly loading: boolean;
  readonly error: string | undefined;
  readonly saveColumns: (columns: ColumnsConfig) => Promise<void>;
  readonly setColumnsForEntity: (
    entityKey: Columns.EntityKey,
    columns: readonly ColumnConfig[],
  ) => Promise<void>;
}

function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function parseColumns(input: unknown): ColumnsConfig {
  const result = ColumnsConfigSchema.safeParse(input);
  if (result.success) {
    return { ...DEFAULT_COLUMNS, ...result.data };
  }
  return DEFAULT_COLUMNS;
}

function loadColumnsFromDisk(): ColumnsConfig {
  const columnsPath = getColumnsPath();
  if (!existsSync(columnsPath)) {
    return DEFAULT_COLUMNS;
  }

  const content = readFileSync(columnsPath, "utf-8");
  const parsed: unknown = JSON.parse(content);
  return parseColumns(parsed);
}

async function saveColumnsToDisk(columns: ColumnsConfig): Promise<void> {
  ensureConfigDir();
  const columnsPath = getColumnsPath();
  await fs.writeFile(columnsPath, JSON.stringify(columns, undefined, 2));
}

export function useColumns(): UseColumnsResult {
  const [columns, setColumns] = useState<ColumnsConfig>(DEFAULT_COLUMNS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const latestColumnsRef = useRef<ColumnsConfig>(DEFAULT_COLUMNS);

  useEffect(() => {
    setLoading(true);
    setError(undefined);

    try {
      const loadedColumns = loadColumnsFromDisk();
      latestColumnsRef.current = loadedColumns;
      setColumns(loadedColumns);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to load columns: ${message}`);
      latestColumnsRef.current = DEFAULT_COLUMNS;
      setColumns(DEFAULT_COLUMNS);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveColumns = useCallback(async (nextColumns: ColumnsConfig) => {
    latestColumnsRef.current = nextColumns;
    setColumns(() => nextColumns);
    try {
      await saveColumnsToDisk(nextColumns);
      setError(undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save columns: ${message}`);
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(message);
    }
  }, []);

  const setColumnsForEntity = useCallback(
    async (
      entityKey: Columns.EntityKey,
      nextColumns: readonly ColumnConfig[],
    ) => {
      const updated: ColumnsConfig = {
        ...latestColumnsRef.current,
        [entityKey]: [...nextColumns],
      };
      await saveColumns(updated);
    },
    [saveColumns],
  );

  return {
    columns,
    loading,
    error,
    saveColumns,
    setColumnsForEntity,
  };
}

export function loadColumns(): ColumnsConfig {
  try {
    return loadColumnsFromDisk();
  } catch {
    return DEFAULT_COLUMNS;
  }
}

export async function saveColumns(columns: ColumnsConfig): Promise<void> {
  try {
    await saveColumnsToDisk(columns);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    process.stderr.write(`Failed to save columns: ${message}\n`);
  }
}
