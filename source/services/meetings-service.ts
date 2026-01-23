import type { AttioClient } from "attio-ts-sdk";
import { getV2Meetings } from "attio-ts-sdk";
import type { AttioTypes, MeetingInfo } from "../types/attio.js";

export interface QueryMeetingsResult {
  readonly meetings: readonly MeetingInfo[];
  readonly nextCursor: string | null;
}

// Helper to extract datetime from start/end union type
function getDatetime(
  dateOrDatetime: AttioTypes.MeetingPayload["start"],
): string {
  if ("datetime" in dateOrDatetime) {
    return dateOrDatetime.datetime;
  }
  return dateOrDatetime.date;
}

// Fetch meetings with pagination
export async function fetchMeetings(
  client: AttioClient,
  options: {
    readonly limit?: number;
    readonly cursor?: string;
  } = {},
): Promise<QueryMeetingsResult> {
  const { limit = 25, cursor } = options;

  const response = await getV2Meetings({
    client,
    query: {
      limit,
      ...(cursor ? { cursor } : {}),
    },
  });

  if (response.error) {
    throw new Error(
      `Failed to fetch meetings: ${JSON.stringify(response.error)}`,
    );
  }

  const data = response.data?.data ?? [];
  const meetings = data.map((meeting) => ({
    id: meeting.id.meeting_id,
    title: meeting.title,
    description: meeting.description,
    startAt: getDatetime(meeting.start),
    endAt: getDatetime(meeting.end),
    participants: meeting.participants.map((p) => ({
      emailAddress: p.email_address,
      isOrganizer: p.is_organizer,
      status: p.status,
    })),
  }));

  // Use the next_cursor from pagination object
  const nextCursor = response.data?.pagination?.next_cursor ?? null;

  return {
    meetings,
    nextCursor,
  };
}
