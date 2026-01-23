import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { getWebhookUrlValidation, WebhookUrlStep } from "./webhook-url-step.js";

describe("getWebhookUrlValidation", () => {
  it("trims input and validates schemes", () => {
    const valid = getWebhookUrlValidation("  https://example.com  ");
    expect(valid.trimmed).toBe("https://example.com");
    expect(valid.hasValue).toBe(true);
    expect(valid.isValidUrl).toBe(true);

    const invalid = getWebhookUrlValidation(" example.com ");
    expect(invalid.trimmed).toBe("example.com");
    expect(invalid.hasValue).toBe(true);
    expect(invalid.isValidUrl).toBe(false);

    const empty = getWebhookUrlValidation("   ");
    expect(empty.trimmed).toBe("");
    expect(empty.hasValue).toBe(false);
    expect(empty.isValidUrl).toBe(false);
  });
});

describe("WebhookUrlStep", () => {
  it("shows a scheme warning for invalid URLs", () => {
    const instance = render(
      <WebhookUrlStep
        value="example.com"
        onChange={() => undefined}
        onNext={() => undefined}
      />,
    );

    try {
      expect(instance.lastFrame()).toContain(
        "URL should start with http:// or https://",
      );
    } finally {
      instance.cleanup();
    }
  });
});
