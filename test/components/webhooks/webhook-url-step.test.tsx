import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import {
  getWebhookUrlValidation,
  WebhookUrlStep,
} from "../../../source/components/webhooks/webhook-url-step.js";

describe("getWebhookUrlValidation", () => {
  it("trims input and validates full URLs", () => {
    const valid = getWebhookUrlValidation("  https://example.com  ");
    expect(valid.trimmed).toBe("https://example.com");
    expect(valid.hasValue).toBe(true);
    expect(valid.isValidUrl).toBe(true);
    expect(valid.validationMessage).toBeUndefined();

    const invalid = getWebhookUrlValidation(" example.com ");
    expect(invalid.trimmed).toBe("example.com");
    expect(invalid.hasValue).toBe(true);
    expect(invalid.isValidUrl).toBe(false);
    expect(invalid.validationMessage).toBe("URL must be a valid URL");

    const invalidProtocol = getWebhookUrlValidation("ftp://example.com");
    expect(invalidProtocol.hasValue).toBe(true);
    expect(invalidProtocol.isValidUrl).toBe(false);
    expect(invalidProtocol.validationMessage).toBe("URL must use http/https");

    const invalidHostname = getWebhookUrlValidation("https://");
    expect(invalidHostname.hasValue).toBe(true);
    expect(invalidHostname.isValidUrl).toBe(false);
    expect(invalidHostname.validationMessage).toBe("URL must be a valid URL");

    const empty = getWebhookUrlValidation("   ");
    expect(empty.trimmed).toBe("");
    expect(empty.hasValue).toBe(false);
    expect(empty.isValidUrl).toBe(false);
    expect(empty.validationMessage).toBe("URL is required");
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
      expect(instance.lastFrame()).toContain("URL must be a valid URL");
    } finally {
      instance.cleanup();
    }
  });
});
