import { z } from "zod";
import type { ListId, ObjectId, ObjectSlug, RecordId } from "./ids.js";

// Attio attribute value types
export const TextValueSchema = z.object({
  value: z.string(),
});

export const NumberValueSchema = z.object({
  value: z.number(),
});

export const CurrencyValueSchema = z.object({
  currency_value: z.number(),
  currency_code: z.string().optional(),
});

export const DateValueSchema = z.object({
  value: z.string(), // ISO date string
});

export const TimestampValueSchema = z.object({
  value: z.string(), // ISO timestamp string
});

export const BooleanValueSchema = z.object({
  value: z.boolean(),
});

export const EmailValueSchema = z.object({
  email_address: z.string(),
});

export const PhoneValueSchema = z.object({
  phone_number: z.string(),
});

export const DomainValueSchema = z.object({
  domain: z.string(),
});

export const LocationValueSchema = z.object({
  line_1: z.string().optional(),
  line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  country_code: z.string().optional(),
});

export const SelectValueSchema = z.object({
  option: z.object({
    id: z.object({ option_id: z.string() }),
    title: z.string(),
  }),
});

export const StatusValueSchema = z.object({
  status: z.object({
    id: z.object({ status_id: z.string() }),
    title: z.string(),
  }),
});

export const RecordReferenceValueSchema = z.object({
  target_object: z.string(),
  target_record_id: z.string(),
});

export const PersonValueSchema = z.object({
  person: z.object({
    person_id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email_address: z.string().optional(),
  }),
});

// Union of all attribute value types
export const AttioValueSchema = z.union([
  TextValueSchema,
  NumberValueSchema,
  CurrencyValueSchema,
  DateValueSchema,
  TimestampValueSchema,
  BooleanValueSchema,
  EmailValueSchema,
  PhoneValueSchema,
  DomainValueSchema,
  LocationValueSchema,
  SelectValueSchema,
  StatusValueSchema,
  RecordReferenceValueSchema,
  PersonValueSchema,
]);

export type AttioValue = z.infer<typeof AttioValueSchema>;

// Attribute metadata
export interface AttioAttribute {
  readonly id: { readonly attribute_id: string };
  readonly api_slug: string;
  readonly title: string;
  readonly type: string;
  readonly is_required: boolean;
  readonly is_unique: boolean;
  readonly is_multiselect: boolean;
}

// Attio Object (schema definition)
export interface AttioObject {
  readonly id: { readonly object_id: ObjectId };
  readonly api_slug: ObjectSlug;
  readonly singular_noun: string;
  readonly plural_noun: string;
}

// Attio Record (data instance)
export interface AttioRecord {
  readonly id: {
    readonly object_id: ObjectId;
    readonly record_id: RecordId;
  };
  readonly values: Record<string, readonly AttioValue[]>;
  readonly created_at: string;
}

// Attio List
export interface AttioList {
  readonly id: { readonly list_id: ListId };
  readonly api_slug: string;
  readonly name: string;
  readonly parent_object: ObjectSlug;
}

// Attio List Entry
export interface AttioListEntry {
  readonly id: {
    readonly list_id: ListId;
    readonly entry_id: string;
  };
  readonly parent_record_id: RecordId;
  readonly values: Record<string, readonly AttioValue[]>;
  readonly created_at: string;
}

// Attio Note
export interface AttioNote {
  readonly id: { readonly note_id: string };
  readonly parent_object: string;
  readonly parent_record_id: string;
  readonly title: string;
  readonly content_plaintext: string;
  readonly created_by_actor: {
    readonly type: string;
    readonly id: string;
  };
  readonly created_at: string;
}

// Attio Task
export interface AttioTask {
  readonly id: { readonly task_id: string };
  readonly content_plaintext: string;
  readonly deadline_at: string | null;
  readonly is_completed: boolean;
  readonly assignees: readonly {
    readonly referenced_actor_type: string;
    readonly referenced_actor_id: string;
  }[];
  readonly linked_records: readonly {
    readonly target_object: string;
    readonly target_record_id: string;
  }[];
  readonly created_at: string;
}

// Attio Webhook
export interface AttioWebhook {
  readonly id: { readonly webhook_id: string };
  readonly target_url: string;
  readonly status: "active" | "paused";
  readonly subscriptions: readonly {
    readonly event_type: string;
    readonly filter: {
      readonly object?: string;
      readonly list?: string;
    };
  }[];
  readonly created_at: string;
}

// Attio Meeting (Calendar Event)
export interface AttioMeeting {
  readonly id: { readonly calendar_event_id: string };
  readonly title: string;
  readonly description: string | null;
  readonly start_at: string;
  readonly end_at: string;
  readonly location: string | null;
  readonly attendees: readonly {
    readonly email_address: string;
    readonly is_organizer: boolean;
  }[];
}

// Helper to extract display name from a record
export function getRecordDisplayName(record: AttioRecord): string {
  // Try common name attributes based on object type
  const nameAttributes = [
    "name",
    "full_name",
    "title",
    "first_name",
    "company_name",
  ];

  for (const attr of nameAttributes) {
    const values = record.values[attr];
    const firstValue = values?.[0];
    if (firstValue && "value" in firstValue) {
      const val = firstValue["value" as keyof typeof firstValue];
      if (typeof val === "string") {
        return val;
      }
    }
  }

  // Fallback to record ID
  return record.id.record_id;
}

// Helper to extract subtitle from a record
export function getRecordSubtitle(record: AttioRecord): string {
  // Try common subtitle attributes
  const subtitleAttributes = [
    "email_addresses",
    "domains",
    "description",
    "job_title",
  ];

  for (const attr of subtitleAttributes) {
    const values = record.values[attr];
    const firstValue = values?.[0];
    if (firstValue && "email_address" in firstValue) {
      const emailAddr = firstValue[
        "email_address" as keyof typeof firstValue
      ] as string;
      return emailAddr;
    }
    if (firstValue && "domain" in firstValue) {
      const domain = firstValue["domain" as keyof typeof firstValue] as string;
      return domain;
    }
    if (firstValue && "value" in firstValue) {
      const val = firstValue["value" as keyof typeof firstValue];
      if (typeof val === "string") {
        return val;
      }
    }
  }

  return "";
}
