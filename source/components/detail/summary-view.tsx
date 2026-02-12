import { Box, Text } from "ink";
import type {
  ListEntryInfo,
  ListInfo,
  MeetingInfo,
  NoteInfo,
  ObjectInfo,
  RecordInfo,
  StatusInfo,
  TaskInfo,
  WebhookInfo,
} from "../../types/attio.js";
import type { ResultItem } from "../../types/navigation.js";
import {
  formatDate,
  formatDateTime,
  formatValue,
} from "../../utils/formatting.js";

interface SummaryViewProps {
  readonly item: ResultItem | undefined;
}

// Row component for consistent formatting
function SummaryRow({
  label,
  value,
  dimValue = false,
}: {
  readonly label: string;
  readonly value: string | undefined;
  readonly dimValue?: boolean;
}) {
  if (!value) {
    return null;
  }
  return (
    <Box>
      <Text bold={true}>{label}: </Text>
      <Text dimColor={dimValue}>{value}</Text>
    </Box>
  );
}

// Record summary for objects (companies, people, etc.)
function RecordSummary({ data }: { readonly data: RecordInfo }) {
  const { values } = data;
  const displayFields: Array<{ label: string; key: string }> = [
    { label: "Name", key: "name" },
    { label: "Full Name", key: "full_name" },
    { label: "Email", key: "email_addresses" },
    { label: "Phone", key: "phone_numbers" },
    { label: "Domain", key: "domains" },
    { label: "Job Title", key: "job_title" },
    { label: "Description", key: "description" },
  ];

  return (
    <Box flexDirection="column" gap={1}>
      <SummaryRow label="ID" value={data.id} dimValue={true} />
      <SummaryRow label="Created" value={formatDateTime(data.createdAt)} />
      <Box marginTop={1}>
        <Text bold={true} underline={true}>
          Fields
        </Text>
      </Box>
      {displayFields.map(({ label, key }) => {
        const fieldValue = values[key];
        if (!fieldValue || fieldValue.length === 0) {
          return null;
        }
        return (
          <SummaryRow key={key} label={label} value={formatValue(fieldValue)} />
        );
      })}
    </Box>
  );
}

// Note summary
function NoteSummary({ data }: { readonly data: NoteInfo }) {
  return (
    <Box flexDirection="column" gap={1}>
      <SummaryRow label="Title" value={data.title || "Untitled"} />
      <SummaryRow
        label="Parent"
        value={`${data.parentObject}/${data.parentRecordId}`}
      />
      <SummaryRow label="Created" value={formatDateTime(data.createdAt)} />
      <SummaryRow label="Created By" value={`${data.createdByType}`} />
      <Box marginTop={1}>
        <Text bold={true} underline={true}>
          Content
        </Text>
      </Box>
      <Text wrap="wrap">{data.contentPlaintext || "(empty)"}</Text>
    </Box>
  );
}

// Task summary
function TaskSummary({ data }: { readonly data: TaskInfo }) {
  const statusText = data.isCompleted ? "Completed" : "Pending";
  const statusColor = data.isCompleted ? "green" : "yellow";

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text bold={true}>Status: </Text>
        <Text color={statusColor}>{statusText}</Text>
      </Box>
      {data.deadlineAt && (
        <SummaryRow label="Deadline" value={formatDate(data.deadlineAt)} />
      )}
      <SummaryRow label="Created" value={formatDateTime(data.createdAt)} />
      <SummaryRow label="Assignees" value={String(data.assignees.length)} />
      <SummaryRow
        label="Linked Records"
        value={String(data.linkedRecords.length)}
      />
      <Box marginTop={1}>
        <Text bold={true} underline={true}>
          Content
        </Text>
      </Box>
      <Text wrap="wrap">{data.content}</Text>
    </Box>
  );
}

// Meeting summary
function MeetingSummary({ data }: { readonly data: MeetingInfo }) {
  return (
    <Box flexDirection="column" gap={1}>
      <SummaryRow label="Title" value={data.title || "Untitled Meeting"} />
      <SummaryRow label="Start" value={formatDateTime(data.startAt)} />
      <SummaryRow label="End" value={formatDateTime(data.endAt)} />
      <SummaryRow
        label="Participants"
        value={String(data.participants.length)}
      />
      {data.description && (
        <>
          <Box marginTop={1}>
            <Text bold={true} underline={true}>
              Description
            </Text>
          </Box>
          <Text wrap="wrap">{data.description}</Text>
        </>
      )}
      {data.participants.length > 0 && (
        <>
          <Box marginTop={1}>
            <Text bold={true} underline={true}>
              Participants
            </Text>
          </Box>
          {data.participants.slice(0, 5).map((participant, idx) => {
            const participantKey = [
              participant.emailAddress ?? `idx-${idx}`,
              participant.status,
              participant.isOrganizer ? "organizer" : "attendee",
            ].join(":");

            return (
              <Box key={participantKey}>
                <Text>
                  {participant.emailAddress || "(no email)"}
                  {participant.isOrganizer ? " (organizer)" : ""}
                </Text>
              </Box>
            );
          })}
          {data.participants.length > 5 && (
            <Text dimColor={true}>
              ...and {data.participants.length - 5} more
            </Text>
          )}
        </>
      )}
    </Box>
  );
}

// Webhook summary
function WebhookSummary({ data }: { readonly data: WebhookInfo }) {
  let statusColor: "green" | "red" | "yellow";
  if (data.status === "active") {
    statusColor = "green";
  } else if (data.status === "degraded") {
    statusColor = "yellow";
  } else {
    statusColor = "red";
  }

  return (
    <Box flexDirection="column" gap={1}>
      <SummaryRow label="Target URL" value={data.targetUrl} />
      <Box>
        <Text bold={true}>Status: </Text>
        <Text color={statusColor}>{data.status}</Text>
      </Box>
      <SummaryRow label="Created" value={formatDateTime(data.createdAt)} />
      <SummaryRow
        label="Subscriptions"
        value={String(data.subscriptions.length)}
      />
      {data.subscriptions.length > 0 && (
        <>
          <Box marginTop={1}>
            <Text bold={true} underline={true}>
              Event Types
            </Text>
          </Box>
          {data.subscriptions.slice(0, 5).map((subscription) => (
            <Text key={subscription.eventType}>- {subscription.eventType}</Text>
          ))}
          {data.subscriptions.length > 5 && (
            <Text dimColor={true}>
              ...and {data.subscriptions.length - 5} more
            </Text>
          )}
        </>
      )}
    </Box>
  );
}

// List summary
function ListSummary({ data }: { readonly data: ListInfo }) {
  return (
    <Box flexDirection="column" gap={1}>
      <SummaryRow label="Name" value={data.name} />
      <SummaryRow label="ID" value={data.id} dimValue={true} />
      <SummaryRow label="Slug" value={data.apiSlug} />
      <SummaryRow label="Parent Object" value={data.parentObject} />
    </Box>
  );
}

// Status summary
function StatusSummary({ data }: { readonly data: StatusInfo }) {
  return (
    <Box flexDirection="column" gap={1}>
      <SummaryRow label="Title" value={data.title} />
      <SummaryRow label="Status ID" value={data.statusId} dimValue={true} />
      <Box>
        <Text bold={true}>Archived: </Text>
        <Text color={data.isArchived ? "red" : "green"}>
          {data.isArchived ? "Yes" : "No"}
        </Text>
      </Box>
      {data.celebrationEnabled && (
        <SummaryRow label="Celebration" value="Enabled" />
      )}
      {data.targetTimeInStatus && (
        <SummaryRow label="Target Time" value={data.targetTimeInStatus} />
      )}
    </Box>
  );
}

// List entry summary
function ListEntrySummary({ data }: { readonly data: ListEntryInfo }) {
  return (
    <Box flexDirection="column" gap={1}>
      <SummaryRow label="Entry ID" value={data.id} dimValue={true} />
      <SummaryRow label="List ID" value={data.listId} dimValue={true} />
      <SummaryRow
        label="Parent Record"
        value={data.parentRecordId}
        dimValue={true}
      />
      <SummaryRow label="Created" value={formatDateTime(data.createdAt)} />
    </Box>
  );
}

// Object info summary
function ObjectInfoSummary({ data }: { readonly data: ObjectInfo }) {
  return (
    <Box flexDirection="column" gap={1}>
      <SummaryRow label="Name" value={data.singularNoun ?? undefined} />
      <SummaryRow label="Plural" value={data.pluralNoun ?? undefined} />
      <SummaryRow label="Slug" value={data.apiSlug} />
      <SummaryRow label="ID" value={data.id} dimValue={true} />
    </Box>
  );
}

// Generic fallback summary
function GenericSummary({ item }: { readonly item: ResultItem }) {
  return (
    <Box flexDirection="column" gap={1}>
      <SummaryRow label="Title" value={item.title} />
      {item.subtitle && <SummaryRow label="Subtitle" value={item.subtitle} />}
      <SummaryRow label="ID" value={item.id} dimValue={true} />
    </Box>
  );
}

export function SummaryView({ item }: SummaryViewProps) {
  if (!item) {
    return <Text dimColor={true}>Select an item to view details</Text>;
  }

  switch (item.type) {
    case "object":
      return <RecordSummary data={item.data} />;
    case "object-info":
      return <ObjectInfoSummary data={item.data} />;
    case "list":
      return <ListSummary data={item.data} />;
    case "list-status":
      return <StatusSummary data={item.data} />;
    case "list-entry":
      return <ListEntrySummary data={item.data} />;
    case "notes":
      return <NoteSummary data={item.data} />;
    case "tasks":
      return <TaskSummary data={item.data} />;
    case "meetings":
      return <MeetingSummary data={item.data} />;
    case "webhooks":
      return <WebhookSummary data={item.data} />;
  }

  return <GenericSummary item={item} />;
}
