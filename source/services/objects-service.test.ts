import {
  createAttioClient,
  type GetV2ObjectsByObjectRecordsByRecordIdResponses,
  getV2ObjectsByObjectRecordsByRecordId,
} from "attio-ts-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseObjectSlug, parseRecordId } from "../types/ids.js";
import { getRecord } from "./objects-service.js";

vi.mock("attio-ts-sdk", async () => {
  const actual =
    await vi.importActual<typeof import("attio-ts-sdk")>("attio-ts-sdk");

  return {
    ...actual,
    getV2Objects: vi.fn(),
    postV2ObjectsByObjectRecordsQuery: vi.fn(),
    getV2ObjectsByObjectRecordsByRecordId: vi.fn(),
  };
});

const buildRequest = (): Request => new Request("https://example.com");

const buildResponse = (status: number): Response =>
  new Response(null, { status });

const buildSuccess = <TData>(data: TData) => ({
  data,
  error: undefined,
  request: buildRequest(),
  response: buildResponse(200),
});

const buildError = <TError>(error: TError, status: number) => ({
  data: undefined,
  error,
  request: buildRequest(),
  response: buildResponse(status),
});

describe("getRecord", () => {
  const client = createAttioClient({
    apiKey: "at_0123456789abcdef0123456789abcdef0123456789abcdef",
  });
  const objectSlug = parseObjectSlug("companies");
  const recordId = parseRecordId("11111111-1111-1111-8111-111111111111");
  const recordIdValue = recordId.toString();
  const record: GetV2ObjectsByObjectRecordsByRecordIdResponses[200]["data"] = {
    id: {
      workspace_id: "22222222-2222-2222-8222-222222222222",
      object_id: "33333333-3333-3333-8333-333333333333",
      record_id: recordIdValue,
    },
    created_at: "2024-01-01T00:00:00Z",
    web_url:
      "https://app.attio.com/record/11111111-1111-1111-8111-111111111111",
    values: {
      status: [
        {
          active_from: "2024-01-01T00:00:00Z",
          active_until: null,
          created_by_actor: {},
          value: true,
          attribute_type: "checkbox",
        },
      ],
    },
  };

  const getRecordById = vi.mocked(getV2ObjectsByObjectRecordsByRecordId);

  beforeEach(() => {
    getRecordById.mockReset();
  });

  it("fetches a record by id", async () => {
    getRecordById.mockResolvedValue(buildSuccess({ data: record }));

    const result = await getRecord(client, objectSlug, recordIdValue);

    expect(result).toEqual({
      id: recordIdValue,
      objectId: record.id.object_id,
      values: record.values,
      createdAt: record.created_at,
      webUrl: record.web_url,
    });
    expect(getRecordById).toHaveBeenCalledWith({
      client,
      path: {
        object: objectSlug,
        record_id: recordIdValue,
      },
    });
  });

  it("returns undefined when the record is not found", async () => {
    getRecordById.mockResolvedValue(
      buildError(
        {
          status_code: 404,
          type: "invalid_request_error",
          code: "not_found",
          message: "Record not found",
        },
        404,
      ),
    );

    const result = await getRecord(client, objectSlug, recordIdValue);

    expect(result).toBeUndefined();
  });
});
