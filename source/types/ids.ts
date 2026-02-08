import { z } from "zod";

// Re-export SDK's ListId type and factory
export { createListId, type ListId } from "attio-ts-sdk";

// Branded ID schemas for type-safe identifiers
// All IDs are UUIDs but branded for compile-time safety

export const ObjectIdSchema = z.string().uuid().brand<"ObjectId">();
export type ObjectId = z.infer<typeof ObjectIdSchema>;

export const ObjectSlugSchema = z.string().min(1).brand<"ObjectSlug">();
export type ObjectSlug = z.infer<typeof ObjectSlugSchema>;

export const RecordIdSchema = z.string().uuid().brand<"RecordId">();
export type RecordId = z.infer<typeof RecordIdSchema>;

export const ListEntryIdSchema = z.string().uuid().brand<"ListEntryId">();
export type ListEntryId = z.infer<typeof ListEntryIdSchema>;

export const NoteIdSchema = z.string().uuid().brand<"NoteId">();
export type NoteId = z.infer<typeof NoteIdSchema>;

export const TaskIdSchema = z.string().uuid().brand<"TaskId">();
export type TaskId = z.infer<typeof TaskIdSchema>;

export const MeetingIdSchema = z.string().uuid().brand<"MeetingId">();
export type MeetingId = z.infer<typeof MeetingIdSchema>;

export const WebhookIdSchema = z.string().uuid().brand<"WebhookId">();
export type WebhookId = z.infer<typeof WebhookIdSchema>;

export const AttributeIdSchema = z.string().uuid().brand<"AttributeId">();
export type AttributeId = z.infer<typeof AttributeIdSchema>;

export const AttributeSlugSchema = z.string().min(1).brand<"AttributeSlug">();
export type AttributeSlug = z.infer<typeof AttributeSlugSchema>;

export const WorkspaceIdSchema = z.string().uuid().brand<"WorkspaceId">();
export type WorkspaceId = z.infer<typeof WorkspaceIdSchema>;

export const UserIdSchema = z.string().uuid().brand<"UserId">();
export type UserId = z.infer<typeof UserIdSchema>;

// Helper to parse and brand an ID safely
export function parseObjectId(value: string): ObjectId {
  return ObjectIdSchema.parse(value);
}

export function parseObjectSlug(value: string): ObjectSlug {
  return ObjectSlugSchema.parse(value);
}

export function parseRecordId(value: string): RecordId {
  return RecordIdSchema.parse(value);
}

export function parseNoteId(value: string): NoteId {
  return NoteIdSchema.parse(value);
}

export function parseTaskId(value: string): TaskId {
  return TaskIdSchema.parse(value);
}

export function parseMeetingId(value: string): MeetingId {
  return MeetingIdSchema.parse(value);
}

export function parseWebhookId(value: string): WebhookId {
  return WebhookIdSchema.parse(value);
}
