import type { WebhookEventType } from "../types/attio.js";

// Available webhook event types from Attio API
// Grouped by category for better UX in the picker

export interface WebhookEventCategory {
  readonly name: string;
  readonly events: readonly WebhookEventDefinition[];
}

export interface WebhookEventDefinition {
  readonly value: WebhookEventType;
  readonly label: string;
}

export const WEBHOOK_EVENT_CATEGORIES: readonly WebhookEventCategory[] = [
  {
    name: "Records",
    events: [
      { value: "record.created", label: "Record created" },
      { value: "record.updated", label: "Record updated" },
      { value: "record.merged", label: "Record merged" },
      { value: "record.deleted", label: "Record deleted" },
    ],
  },
  {
    name: "Notes",
    events: [
      { value: "note.created", label: "Note created" },
      { value: "note.updated", label: "Note updated" },
      { value: "note-content.updated", label: "Note content updated" },
      { value: "note.deleted", label: "Note deleted" },
    ],
  },
  {
    name: "Tasks",
    events: [
      { value: "task.created", label: "Task created" },
      { value: "task.updated", label: "Task updated" },
      { value: "task.deleted", label: "Task deleted" },
    ],
  },
  {
    name: "Lists",
    events: [
      { value: "list.created", label: "List created" },
      { value: "list.updated", label: "List updated" },
      { value: "list.deleted", label: "List deleted" },
    ],
  },
  {
    name: "List Entries",
    events: [
      { value: "list-entry.created", label: "List entry created" },
      { value: "list-entry.updated", label: "List entry updated" },
      { value: "list-entry.deleted", label: "List entry deleted" },
    ],
  },
  {
    name: "List Attributes",
    events: [
      { value: "list-attribute.created", label: "List attribute created" },
      { value: "list-attribute.updated", label: "List attribute updated" },
    ],
  },
  {
    name: "Object Attributes",
    events: [
      { value: "object-attribute.created", label: "Object attribute created" },
      { value: "object-attribute.updated", label: "Object attribute updated" },
    ],
  },
  {
    name: "Comments",
    events: [
      { value: "comment.created", label: "Comment created" },
      { value: "comment.resolved", label: "Comment resolved" },
      { value: "comment.unresolved", label: "Comment unresolved" },
      { value: "comment.deleted", label: "Comment deleted" },
    ],
  },
  {
    name: "Other",
    events: [
      { value: "call-recording.created", label: "Call recording created" },
      { value: "workspace-member.created", label: "Workspace member created" },
    ],
  },
];

// Flat list of all events for easy lookup
export const ALL_WEBHOOK_EVENTS = WEBHOOK_EVENT_CATEGORIES.flatMap(
  (cat) => cat.events,
);

const WEBHOOK_EVENT_VALUES = new Set<string>(
  ALL_WEBHOOK_EVENTS.map((event) => event.value),
);

export function isValidEventType(
  eventType: string,
): eventType is WebhookEventType {
  return WEBHOOK_EVENT_VALUES.has(eventType);
}

// Get event label by value
export function getEventLabel(eventValue: string): string {
  const event = ALL_WEBHOOK_EVENTS.find((e) => e.value === eventValue);
  return event?.label ?? eventValue;
}
