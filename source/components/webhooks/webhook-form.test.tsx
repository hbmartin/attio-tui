import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { ALL_WEBHOOK_EVENTS } from "../../constants/webhook-events.js";
import {
  canAdvanceWebhookFormStep,
  isWebhookTargetUrlValid,
  WebhookForm,
} from "./webhook-form.js";

type RenderInstance = ReturnType<typeof render>;

function prepareStdin(instance: RenderInstance): void {
  Object.assign(instance.stdin, {
    ref: () => undefined,
    unref: () => undefined,
    read: () => null,
  });
}

describe("WebhookForm navigation helpers", () => {
  it("validates target URLs", () => {
    expect(isWebhookTargetUrlValid("")).toBe(false);
    expect(isWebhookTargetUrlValid("example.com")).toBe(false);
    expect(isWebhookTargetUrlValid("https://example.com")).toBe(true);
  });

  it("requires a valid URL on the url step", () => {
    expect(
      canAdvanceWebhookFormStep({
        step: "url",
        targetUrl: "",
        selectedEvents: [],
      }),
    ).toBe(false);

    expect(
      canAdvanceWebhookFormStep({
        step: "url",
        targetUrl: "https://example.com",
        selectedEvents: [],
      }),
    ).toBe(true);
  });

  it("requires at least one event on the subscriptions step", () => {
    const [firstEvent] = ALL_WEBHOOK_EVENTS;
    if (!firstEvent) {
      throw new Error("Expected at least one webhook event");
    }

    expect(
      canAdvanceWebhookFormStep({
        step: "subscriptions",
        targetUrl: "https://example.com",
        selectedEvents: [],
      }),
    ).toBe(false);

    expect(
      canAdvanceWebhookFormStep({
        step: "subscriptions",
        targetUrl: "https://example.com",
        selectedEvents: [firstEvent.value],
      }),
    ).toBe(true);
  });

  it("always allows advancing from the review step", () => {
    expect(
      canAdvanceWebhookFormStep({
        step: "review",
        targetUrl: "",
        selectedEvents: [],
      }),
    ).toBe(true);
  });
});

describe("WebhookForm", () => {
  it("renders the create webhook header", () => {
    const instance = render(
      <WebhookForm
        mode="create"
        step="url"
        targetUrl=""
        selectedEvents={[]}
        onUrlChange={() => undefined}
        onToggleEvent={() => undefined}
        onNavigateStep={() => undefined}
        onSubmit={() => undefined}
        onCancel={() => undefined}
        isSubmitting={false}
      />,
    );

    prepareStdin(instance);

    try {
      expect(instance.lastFrame()).toContain("Create Webhook");
    } finally {
      instance.cleanup();
    }
  });
});
