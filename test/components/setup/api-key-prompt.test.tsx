import process from "node:process";
import { render } from "ink-testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiKeyPrompt } from "../../../source/components/setup/api-key-prompt.js";

const ENV_KEY = "ATTIO_TUI_PTY_DEBUG";

describe("ApiKeyPrompt", () => {
  let originalValue: string | undefined;

  beforeEach(() => {
    originalValue = process.env[ENV_KEY];
  });

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = originalValue;
    }
    vi.restoreAllMocks();
  });

  it("logs mount and unmount when PTY debug is enabled", async () => {
    process.env[ENV_KEY] = "1";
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const instance = render(<ApiKeyPrompt onSubmit={() => undefined} />);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(writeSpy).toHaveBeenCalledWith("[PTY-DEBUG] api-key prompt mount\n");

    instance.cleanup();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(writeSpy).toHaveBeenCalledWith(
      "[PTY-DEBUG] api-key prompt unmount\n",
    );
  });
});
