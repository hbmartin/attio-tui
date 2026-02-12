import { Box, Text } from "ink";
import type { ResultItem } from "../../types/navigation.js";

interface SdkViewProps {
  readonly item: ResultItem | undefined;
}

// Typed dispatch keyed on ResultItem["type"] — each entry produces SDK code lines
const sdkCodeGenerators: {
  readonly [T in ResultItem["type"]]: (
    item: Extract<ResultItem, { type: T }>,
  ) => string[];
} = {
  object: (item) => [
    "// Fetch this record",
    "const record = await client.records.get({",
    `  object: "${item.data.objectId}",`,
    `  recordId: "${item.id}",`,
    "});",
  ],
  list: (item) => [
    "// Query entries for this list",
    "const entries = await client.lists.entries.query({",
    `  listId: "${item.id}",`,
    "});",
  ],
  "list-status": (item) => [
    "// List statuses for this attribute",
    "const statuses = await client.objects.attributes.statuses.list({",
    `  attribute: "${item.data.attributeId}",`,
    "});",
  ],
  "list-entry": (item) => [
    "// Fetch this list entry",
    "const entry = await client.lists.entries.get({",
    `  listId: "${item.data.listId}",`,
    `  entryId: "${item.id}",`,
    "});",
  ],
  notes: (item) => [
    "// Fetch this note",
    "const note = await client.notes.get({",
    `  noteId: "${item.id}",`,
    "});",
  ],
  tasks: (item) => [
    "// Fetch this task",
    "const task = await client.tasks.get({",
    `  taskId: "${item.id}",`,
    "});",
  ],
  meetings: (item) => [
    "// Fetch this meeting",
    "const meeting = await client.meetings.get({",
    `  meetingId: "${item.id}",`,
    "});",
  ],
  webhooks: (item) => [
    "// Fetch this webhook",
    "const webhook = await client.webhooks.get({",
    `  webhookId: "${item.id}",`,
    "});",
  ],
};

function generateSdkCode(item: ResultItem | undefined): string[] {
  if (!item) {
    return ["// Select an item to view SDK code"];
  }

  const generator = sdkCodeGenerators[item.type] as (
    item: ResultItem,
  ) => string[];
  return generator(item);
}

export function SdkView({ item }: SdkViewProps) {
  const codeLines = generateSdkCode(item);

  return (
    <Box flexDirection="column">
      {codeLines.map((line, lineIndex) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Code lines have no stable ID
        <Text key={lineIndex} color={line.startsWith("//") ? "gray" : "cyan"}>
          {line}
        </Text>
      ))}
    </Box>
  );
}
