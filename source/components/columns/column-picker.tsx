import { Box, Text, useInput } from "ink";
import { useEffect, useMemo, useState } from "react";
import type { ColumnConfig } from "../../schemas/columns-schema.js";
import type { Columns } from "../../types/columns.js";

interface ColumnPickerProps {
  readonly title: string;
  readonly availableColumns: readonly Columns.Definition[];
  readonly selectedColumns: readonly ColumnConfig[];
  readonly defaultColumns: readonly ColumnConfig[];
  readonly onSave: (columns: readonly ColumnConfig[]) => void;
  readonly onClose: () => void;
}

export function ColumnPicker({
  title,
  availableColumns,
  selectedColumns,
  defaultColumns,
  onSave,
  onClose,
}: ColumnPickerProps) {
  const initialSelected = useMemo(
    () => selectedColumns.map((column) => column.attribute),
    [selectedColumns],
  );
  const defaultSelected = useMemo(
    () => defaultColumns.map((column) => column.attribute),
    [defaultColumns],
  );

  const [cursorIndex, setCursorIndex] = useState(0);
  const [selectedAttributes, setSelectedAttributes] = useState(
    () => initialSelected,
  );

  useEffect(() => {
    setSelectedAttributes(initialSelected);
    setCursorIndex(0);
  }, [initialSelected]);

  const selectedSet = useMemo(
    () => new Set(selectedAttributes),
    [selectedAttributes],
  );

  const moveCursor = (direction: "up" | "down") => {
    if (availableColumns.length === 0) {
      return;
    }
    setCursorIndex((current) => {
      const next = direction === "up" ? current - 1 : current + 1;
      return Math.max(0, Math.min(availableColumns.length - 1, next));
    });
  };

  const toggleSelection = () => {
    const current = availableColumns[cursorIndex];
    if (!current) {
      return;
    }

    setSelectedAttributes((previous) => {
      const isSelected = previous.includes(current.attribute);
      if (isSelected) {
        if (previous.length === 1) {
          return previous;
        }
        return previous.filter((attr) => attr !== current.attribute);
      }
      return [...previous, current.attribute];
    });
  };

  const resetToDefaults = () => {
    setSelectedAttributes(defaultSelected);
    setCursorIndex(0);
  };

  useInput((input, key) => {
    const isEnter = key.return || input === "\r" || input === "\n";
    if (key.escape) {
      onClose();
      return;
    }

    if (isEnter) {
      const selectedSet = new Set(selectedAttributes);
      const nextColumns = availableColumns
        .filter((column) => selectedSet.has(column.attribute))
        .map((column) => ({ attribute: column.attribute }));
      onSave(nextColumns);
      onClose();
      return;
    }

    if (key.upArrow || input === "k") {
      moveCursor("up");
      return;
    }

    if (key.downArrow || input === "j") {
      moveCursor("down");
      return;
    }

    if (input === " ") {
      toggleSelection();
      return;
    }

    if (input === "r") {
      resetToDefaults();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold={true} color="cyan">
          Columns
        </Text>
        <Text dimColor={true}>{title}</Text>
      </Box>

      {availableColumns.length === 0 ? (
        <Text dimColor={true}>No columns available.</Text>
      ) : (
        <Box flexDirection="column">
          {availableColumns.map((column, index) => {
            const isCursor = index === cursorIndex;
            const isSelected = selectedSet.has(column.attribute);
            const checkbox = isSelected ? "[x]" : "[ ]";
            const labelColor = isCursor ? "cyan" : undefined;
            const metaColor = isCursor ? "cyan" : "gray";

            return (
              <Box key={column.attribute} gap={1}>
                <Text color={labelColor}>{isCursor ? ">" : " "}</Text>
                <Text color={isSelected ? "green" : undefined}>{checkbox}</Text>
                <Text color={labelColor}>{column.label}</Text>
                <Text color={metaColor} dimColor={!isCursor}>
                  ({column.attribute})
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor={true}>
          j/k or arrows: Navigate | Space: Toggle | Enter: Save | r: Reset |
          Esc: Cancel
        </Text>
      </Box>
    </Box>
  );
}
