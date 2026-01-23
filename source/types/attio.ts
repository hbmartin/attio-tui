import type {
  GetV2ListsResponse,
  GetV2MeetingsResponse,
  GetV2NotesResponse,
  GetV2ObjectsByObjectRecordsByRecordIdResponse,
  GetV2ObjectsResponse,
  GetV2TasksResponse,
  PatchV2WebhooksByWebhookIdData,
  PostV2ListsByListEntriesQueryResponse,
  PostV2ObjectsByObjectRecordsQueryResponse,
  PostV2WebhooksData,
  PostV2WebhooksResponse,
} from "attio-ts-sdk";

// biome-ignore lint/style/noNamespace: Use a namespace to group SDK-derived types.
export namespace AttioTypes {
  export type ObjectPayload = NonNullable<GetV2ObjectsResponse["data"]>[number];

  export interface ObjectInfo {
    readonly id: ObjectPayload["id"]["object_id"];
    readonly apiSlug: string;
    readonly singularNoun: ObjectPayload["singular_noun"];
    readonly pluralNoun: ObjectPayload["plural_noun"];
  }

  export type RecordPayload = NonNullable<
    PostV2ObjectsByObjectRecordsQueryResponse["data"]
  >[number];

  export type RecordDetailPayload = NonNullable<
    GetV2ObjectsByObjectRecordsByRecordIdResponse["data"]
  >;

  export type RecordValues = RecordPayload["values"];

  export type RecordValue = RecordValues[string][number];

  export interface RecordInfo {
    readonly id: RecordPayload["id"]["record_id"];
    readonly objectId: RecordPayload["id"]["object_id"];
    readonly values: RecordValues;
    readonly createdAt: RecordPayload["created_at"];
  }

  export type ListPayload = NonNullable<GetV2ListsResponse["data"]>[number];

  export interface ListInfo {
    readonly id: ListPayload["id"]["list_id"];
    readonly apiSlug: ListPayload["api_slug"];
    readonly name: ListPayload["name"];
    readonly parentObject: string;
  }

  export type ListEntryPayload = NonNullable<
    PostV2ListsByListEntriesQueryResponse["data"]
  >[number];

  export type ListEntryValues = ListEntryPayload["entry_values"];

  export interface ListEntryInfo {
    readonly id: ListEntryPayload["id"]["entry_id"];
    readonly listId: ListEntryPayload["id"]["list_id"];
    readonly parentRecordId: ListEntryPayload["parent_record_id"];
    readonly values: ListEntryValues;
    readonly createdAt: ListEntryPayload["created_at"];
  }

  export type NotePayload = NonNullable<GetV2NotesResponse["data"]>[number];

  export interface NoteInfo {
    readonly id: NotePayload["id"]["note_id"];
    readonly parentObject: NotePayload["parent_object"];
    readonly parentRecordId: NotePayload["parent_record_id"];
    readonly title: NotePayload["title"];
    readonly contentPlaintext: NotePayload["content_plaintext"];
    readonly createdAt: NotePayload["created_at"];
    readonly createdByType: NotePayload["created_by_actor"]["type"] | "unknown";
    readonly createdById: NotePayload["created_by_actor"]["id"] | "";
  }

  export type TaskPayload = NonNullable<GetV2TasksResponse["data"]>[number];

  export interface TaskAssignee {
    readonly actorType: TaskPayload["assignees"][number]["referenced_actor_type"];
    readonly actorId: TaskPayload["assignees"][number]["referenced_actor_id"];
  }

  export interface TaskLinkedRecord {
    readonly targetObject: TaskPayload["linked_records"][number]["target_object_id"];
    readonly targetRecordId: TaskPayload["linked_records"][number]["target_record_id"];
  }

  export interface TaskInfo {
    readonly id: TaskPayload["id"]["task_id"];
    readonly content: TaskPayload["content_plaintext"];
    readonly deadlineAt: TaskPayload["deadline_at"];
    readonly isCompleted: TaskPayload["is_completed"];
    readonly assignees: readonly TaskAssignee[];
    readonly linkedRecords: readonly TaskLinkedRecord[];
    readonly createdAt: TaskPayload["created_at"];
  }

  export type MeetingPayload = NonNullable<
    GetV2MeetingsResponse["data"]
  >[number];

  export interface MeetingParticipant {
    readonly emailAddress: MeetingPayload["participants"][number]["email_address"];
    readonly isOrganizer: MeetingPayload["participants"][number]["is_organizer"];
    readonly status: MeetingPayload["participants"][number]["status"];
  }

  export interface MeetingInfo {
    readonly id: MeetingPayload["id"]["meeting_id"];
    readonly title: MeetingPayload["title"];
    readonly description: MeetingPayload["description"];
    readonly startAt: string;
    readonly endAt: string;
    readonly participants: readonly MeetingParticipant[];
  }

  export type WebhookPayloadBase = Pick<
    NonNullable<PostV2WebhooksResponse["data"]>,
    "id" | "target_url" | "status" | "subscriptions" | "created_at"
  >;

  export type WebhookStatus = WebhookPayloadBase["status"];

  export type WebhookSubscriptionPayload =
    WebhookPayloadBase["subscriptions"][number];

  export interface WebhookSubscription {
    readonly eventType: WebhookSubscriptionPayload["event_type"];
    readonly filter: WebhookSubscriptionPayload["filter"];
  }

  export interface WebhookInfo {
    readonly id: WebhookPayloadBase["id"]["webhook_id"];
    readonly targetUrl: WebhookPayloadBase["target_url"];
    readonly status: WebhookStatus;
    readonly subscriptions: readonly WebhookSubscription[];
    readonly createdAt: WebhookPayloadBase["created_at"];
  }

  export type WebhookCreateSubscriptionInput =
    PostV2WebhooksData["body"]["data"]["subscriptions"][number];

  export type WebhookUpdateSubscriptionInput = NonNullable<
    PatchV2WebhooksByWebhookIdData["body"]["data"]["subscriptions"]
  >[number];
}

export type ObjectInfo = AttioTypes.ObjectInfo;
export type RecordInfo = AttioTypes.RecordInfo;
export type RecordValue = AttioTypes.RecordValue;
export type RecordValues = AttioTypes.RecordValues;
export type ListInfo = AttioTypes.ListInfo;
export type ListEntryInfo = AttioTypes.ListEntryInfo;
export type NoteInfo = AttioTypes.NoteInfo;
export type TaskInfo = AttioTypes.TaskInfo;
export type MeetingInfo = AttioTypes.MeetingInfo;
export type WebhookInfo = AttioTypes.WebhookInfo;
export type WebhookSubscription = AttioTypes.WebhookSubscription;
export type WebhookStatus = AttioTypes.WebhookStatus;
export type WebhookCreateSubscriptionInput =
  AttioTypes.WebhookCreateSubscriptionInput;
export type WebhookUpdateSubscriptionInput =
  AttioTypes.WebhookUpdateSubscriptionInput;
