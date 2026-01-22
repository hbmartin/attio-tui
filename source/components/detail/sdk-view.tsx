import { Box, Text } from "ink";
import type { NavigatorCategory, ResultItem } from "../../types/navigation.js";

interface SdkViewProps {
  readonly item: ResultItem | undefined;
  readonly category: NavigatorCategory | undefined;
}

function generateSdkCode(
  item: ResultItem | undefined,
  category: NavigatorCategory | undefined,
): string[] {
  if (!(item && category)) {
    return ["// Select an item to view SDK code"];
  }

  switch (category.type) {
    case "object":
      return [
        "// Fetch this record",
        "const record = await client.records.get({",
        `  object: "${category.objectSlug}",`,
        `  recordId: "${item.id}",`,
        "});",
      ];
    case "list":
      return [
        "// Fetch this list entry",
        "const entry = await client.lists.entries.get({",
        `  listId: "${category.listId}",`,
        `  entryId: "${item.id}",`,
        "});",
      ];
    case "notes":
      return [
        "// Fetch this note",
        "const note = await client.notes.get({",
        `  noteId: "${item.id}",`,
        "});",
      ];
    case "tasks":
      return [
        "// Fetch this task",
        "const task = await client.tasks.get({",
        `  taskId: "${item.id}",`,
        "});",
      ];
    case "meetings":
      return [
        "// Fetch this meeting",
        "const meeting = await client.meetings.get({",
        `  meetingId: "${item.id}",`,
        "});",
      ];
    case "webhooks":
      return [
        "// Fetch this webhook",
        "const webhook = await client.webhooks.get({",
        `  webhookId: "${item.id}",`,
        "});",
      ];
  }
}

export function SdkView({ item, category }: SdkViewProps) {
  const codeLines = generateSdkCode(item, category);

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
