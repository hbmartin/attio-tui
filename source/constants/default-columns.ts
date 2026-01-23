import type { ColumnConfig, ColumnsConfig } from "../schemas/columns-schema.js";
import type { RecordInfo } from "../types/attio.js";
import { Columns } from "../types/columns.js";
import type { ResultItem } from "../types/navigation.js";
import {
  formatDate,
  formatDateTime,
  formatValue,
} from "../utils/formatting.js";
import { getRecordSubtitle, getRecordTitle } from "../utils/record-values.js";

function withObjectData(
  getter: (data: Extract<ResultItem, { type: "object" }>["data"]) => string,
): (item: ResultItem) => string {
  return (item) => {
    if (item.type !== "object") {
      return "-";
    }
    return getter(item.data);
  };
}

function withListData(
  getter: (data: Extract<ResultItem, { type: "list" }>["data"]) => string,
): (item: ResultItem) => string {
  return (item) => {
    if (item.type !== "list") {
      return "-";
    }
    return getter(item.data);
  };
}

function withNoteData(
  getter: (data: Extract<ResultItem, { type: "notes" }>["data"]) => string,
): (item: ResultItem) => string {
  return (item) => {
    if (item.type !== "notes") {
      return "-";
    }
    return getter(item.data);
  };
}

function withTaskData(
  getter: (data: Extract<ResultItem, { type: "tasks" }>["data"]) => string,
): (item: ResultItem) => string {
  return (item) => {
    if (item.type !== "tasks") {
      return "-";
    }
    return getter(item.data);
  };
}

function withMeetingData(
  getter: (data: Extract<ResultItem, { type: "meetings" }>["data"]) => string,
): (item: ResultItem) => string {
  return (item) => {
    if (item.type !== "meetings") {
      return "-";
    }
    return getter(item.data);
  };
}

function withWebhookData(
  getter: (data: Extract<ResultItem, { type: "webhooks" }>["data"]) => string,
): (item: ResultItem) => string {
  return (item) => {
    if (item.type !== "webhooks") {
      return "-";
    }
    return getter(item.data);
  };
}

function withValueOrDash(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  return value;
}

function getRecordValue(record: RecordInfo, attribute: string): string {
  const values = record.values[attribute];
  if (!values || values.length === 0) {
    return "-";
  }
  return formatValue(values);
}

const DEFAULT_OBJECT_COLUMNS: readonly Columns.Definition[] = [
  {
    attribute: "title",
    label: "Name",
    width: 28,
    value: withObjectData((data) =>
      withValueOrDash(getRecordTitle(data.values)),
    ),
  },
  {
    attribute: "subtitle",
    label: "Details",
    width: 32,
    value: withObjectData((data) =>
      withValueOrDash(getRecordSubtitle(data.values)),
    ),
  },
  {
    attribute: "createdAt",
    label: "Created",
    width: 16,
    value: withObjectData((data) => formatDate(data.createdAt)),
  },
  {
    attribute: "id",
    label: "ID",
    width: 10,
    value: withObjectData((data) => data.id),
  },
];

const COMPANY_COLUMNS: readonly Columns.Definition[] = [
  {
    attribute: "name",
    label: "Name",
    width: 26,
    value: withObjectData((data) => getRecordValue(data, "name")),
  },
  {
    attribute: "domains",
    label: "Domain",
    width: 22,
    value: withObjectData((data) => getRecordValue(data, "domains")),
  },
  {
    attribute: "description",
    label: "Description",
    width: 32,
    value: withObjectData((data) => getRecordValue(data, "description")),
  },
  {
    attribute: "createdAt",
    label: "Created",
    width: 16,
    value: withObjectData((data) => formatDate(data.createdAt)),
  },
];

const PEOPLE_COLUMNS: readonly Columns.Definition[] = [
  {
    attribute: "full_name",
    label: "Name",
    width: 26,
    value: withObjectData((data) => getRecordValue(data, "full_name")),
  },
  {
    attribute: "email_addresses",
    label: "Email",
    width: 26,
    value: withObjectData((data) => getRecordValue(data, "email_addresses")),
  },
  {
    attribute: "job_title",
    label: "Title",
    width: 22,
    value: withObjectData((data) => getRecordValue(data, "job_title")),
  },
  {
    attribute: "company_name",
    label: "Company",
    width: 22,
    value: withObjectData((data) => getRecordValue(data, "company_name")),
  },
];

const LIST_COLUMNS: readonly Columns.Definition[] = [
  {
    attribute: "name",
    label: "Name",
    width: 26,
    value: withListData((data) => data.name),
  },
  {
    attribute: "parentObject",
    label: "Parent",
    width: 16,
    value: withListData((data) => data.parentObject),
  },
  {
    attribute: "apiSlug",
    label: "Slug",
    width: 16,
    value: withListData((data) => data.apiSlug),
  },
];

const NOTE_COLUMNS: readonly Columns.Definition[] = [
  {
    attribute: "title",
    label: "Title",
    width: 26,
    value: withNoteData((data) => withValueOrDash(data.title)),
  },
  {
    attribute: "contentPlaintext",
    label: "Snippet",
    width: 36,
    value: withNoteData((data) => withValueOrDash(data.contentPlaintext)),
  },
  {
    attribute: "createdAt",
    label: "Created",
    width: 16,
    value: withNoteData((data) => formatDate(data.createdAt)),
  },
];

const TASK_COLUMNS: readonly Columns.Definition[] = [
  {
    attribute: "content",
    label: "Task",
    width: 36,
    value: withTaskData((data) => withValueOrDash(data.content)),
  },
  {
    attribute: "status",
    label: "Status",
    width: 12,
    value: withTaskData((data) => (data.isCompleted ? "Completed" : "Pending")),
  },
  {
    attribute: "deadlineAt",
    label: "Due",
    width: 16,
    value: withTaskData((data) => formatDate(data.deadlineAt)),
  },
];

const MEETING_COLUMNS: readonly Columns.Definition[] = [
  {
    attribute: "title",
    label: "Title",
    width: 26,
    value: withMeetingData((data) => withValueOrDash(data.title)),
  },
  {
    attribute: "startAt",
    label: "Start",
    width: 18,
    value: withMeetingData((data) => formatDateTime(data.startAt)),
  },
  {
    attribute: "endAt",
    label: "End",
    width: 18,
    value: withMeetingData((data) => formatDateTime(data.endAt)),
  },
  {
    attribute: "participants",
    label: "Attendees",
    width: 10,
    value: withMeetingData((data) => `${data.participants.length}`),
  },
];

const WEBHOOK_COLUMNS: readonly Columns.Definition[] = [
  {
    attribute: "targetUrl",
    label: "Target",
    width: 32,
    value: withWebhookData((data) => withValueOrDash(data.targetUrl)),
  },
  {
    attribute: "status",
    label: "Status",
    width: 10,
    value: withWebhookData((data) => data.status),
  },
  {
    attribute: "subscriptions",
    label: "Subs",
    width: 8,
    value: withWebhookData((data) => `${data.subscriptions.length}`),
  },
  {
    attribute: "createdAt",
    label: "Created",
    width: 16,
    value: withWebhookData((data) => formatDate(data.createdAt)),
  },
];

export const COLUMN_DEFINITIONS: Record<
  Columns.EntityKey,
  readonly Columns.Definition[]
> = {
  [Columns.DEFAULT_OBJECT_KEY]: DEFAULT_OBJECT_COLUMNS,
  "object-companies": COMPANY_COLUMNS,
  "object-people": PEOPLE_COLUMNS,
  list: LIST_COLUMNS,
  notes: NOTE_COLUMNS,
  tasks: TASK_COLUMNS,
  meetings: MEETING_COLUMNS,
  webhooks: WEBHOOK_COLUMNS,
};

const defaultOnly = (attribute: string): ColumnConfig => ({ attribute });

export const DEFAULT_COLUMNS: ColumnsConfig = {
  [Columns.DEFAULT_OBJECT_KEY]: [
    defaultOnly("title"),
    defaultOnly("subtitle"),
    defaultOnly("createdAt"),
  ],
  "object-companies": [
    defaultOnly("name"),
    defaultOnly("domains"),
    defaultOnly("description"),
  ],
  "object-people": [
    defaultOnly("full_name"),
    defaultOnly("email_addresses"),
    defaultOnly("job_title"),
  ],
  list: [defaultOnly("name"), defaultOnly("parentObject")],
  notes: [
    defaultOnly("title"),
    defaultOnly("contentPlaintext"),
    defaultOnly("createdAt"),
  ],
  tasks: [
    defaultOnly("content"),
    defaultOnly("status"),
    defaultOnly("deadlineAt"),
  ],
  meetings: [
    defaultOnly("title"),
    defaultOnly("startAt"),
    defaultOnly("participants"),
  ],
  webhooks: [
    defaultOnly("targetUrl"),
    defaultOnly("status"),
    defaultOnly("subscriptions"),
  ],
};
