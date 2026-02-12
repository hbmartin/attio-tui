import { Box, Text } from "ink";
import type { ResultItem } from "../../types/navigation.js";

interface SdkViewProps {
  readonly item: ResultItem | undefined;
}

// Mapped type: each key produces a generator that receives the narrowed item
type SdkCodeGenerators = {
  readonly [T in ResultItem["type"]]: (
    item: Extract<ResultItem, { type: T }>,
  ) => string[];
};

const sdkCodeGenerators: SdkCodeGenerators = {
  object: (item) => [
    "// Fetch this record",
    "const record = await client.records.get({",
    `  object: "${item.data.objectId}",`,
    `  recordId: "${item.id}",`,
    "});",
  ],
  "object-info": (item) => [
    "// Query records for this object",
    "const records = await client.records.query({",
    `  object: "${item.data.apiSlug}",`,
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

// Generic helper that preserves the correlation between the discriminant
// key and the narrowed item so the mapped-type lookup yields a single
// parameterised function signature instead of a union of functions.
function invokeSdkGenerator<T extends ResultItem["type"]>(
  type: T,
  item: Extract<ResultItem, { type: T }>,
): string[] {
  return sdkCodeGenerators[type](item);
}

function generateSdkCode(item: ResultItem | undefined): string[] {
  if (!item) {
    return ["// Select an item to view SDK code"];
  }
  return invokeSdkGenerator(item.type, item);
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
