import { createAttioClient } from "attio-ts-sdk";
import { Text } from "ink";
import { render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAttioClientFromConfig,
  useAttioClient,
} from "../../source/hooks/use-attio-client.js";
import type { AppConfig } from "../../source/schemas/config-schema.js";

vi.mock("attio-ts-sdk", async () => {
  const actual =
    await vi.importActual<typeof import("attio-ts-sdk")>("attio-ts-sdk");
  return {
    ...actual,
    createAttioClient: vi.fn(actual.createAttioClient),
  };
});

const TEST_API_KEY = "test-api-key-placeholder";

afterEach(() => {
  vi.clearAllMocks();
});

interface HookHarnessProps {
  readonly config: AppConfig;
}

function HookHarness({ config }: HookHarnessProps) {
  useAttioClient({ config });
  return <Text>ok</Text>;
}

describe("buildAttioClientFromConfig", () => {
  it("returns undefined when apiKey is missing", () => {
    const createAttioClientMock = vi.mocked(createAttioClient);
    const client = buildAttioClientFromConfig({
      apiKey: undefined,
      baseUrl: "https://api.attio.com",
    });

    expect(client).toBeUndefined();
    expect(createAttioClientMock).not.toHaveBeenCalled();
  });

  it("passes apiKey and baseUrl to createAttioClient", () => {
    const createAttioClientMock = vi.mocked(createAttioClient);
    const baseUrl = "https://api.example.test";

    const client = buildAttioClientFromConfig({
      apiKey: TEST_API_KEY,
      baseUrl,
    });

    expect(client).toBeDefined();
    expect(createAttioClientMock).toHaveBeenCalledWith({
      apiKey: TEST_API_KEY,
      baseUrl,
    });
  });
});

describe("useAttioClient", () => {
  it("does not recreate the client when only debugEnabled changes", () => {
    const createAttioClientMock = vi.mocked(createAttioClient);
    const baseConfig: AppConfig = {
      apiKey: TEST_API_KEY,
      baseUrl: "https://api.attio.com",
      debugEnabled: false,
    };

    const instance = render(<HookHarness config={baseConfig} />);

    try {
      expect(createAttioClientMock).toHaveBeenCalledTimes(1);

      const nextConfig: AppConfig = {
        ...baseConfig,
        debugEnabled: true,
      };
      instance.rerender(<HookHarness config={nextConfig} />);

      expect(createAttioClientMock).toHaveBeenCalledTimes(1);
    } finally {
      instance.unmount();
    }
  });
});
