import { render } from "ink-testing-library";
import stringWidth from "string-width";
import { describe, expect, it } from "vitest";
import type { WebhookInfo } from "../../types/attio.js";
import type { Columns } from "../../types/columns.js";
import type { ResultItem } from "../../types/navigation.js";
import { ResultsRow } from "./results-row.js";

const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

function consumeByWidth(
  value: string,
  width: number,
): { readonly consumed: string; readonly rest: string } {
  let consumed = "";
  let consumedLength = 0;
  let currentWidth = 0;

  for (const { segment } of GRAPHEME_SEGMENTER.segment(value)) {
    const segmentWidth = stringWidth(segment);
    if (currentWidth + segmentWidth > width) {
      break;
    }
    consumed += segment;
    consumedLength += segment.length;
    currentWidth += segmentWidth;
  }

  return { consumed, rest: value.slice(consumedLength) };
}

function createWebhookItem(): ResultItem {
  const data: WebhookInfo = {
    id: "webhook-1",
    targetUrl: "https://example.com/webhook",
    status: "active",
    subscriptions: [],
    createdAt: "2024-01-01T00:00:00.000Z",
  };

  return {
    type: "webhooks",
    id: "webhook-1",
    title: "Webhook",
    data,
  };
}

function getRowContent(frame: string | undefined): string {
  const line = frame?.split("\n")[0] ?? "";
  return line.startsWith("  ") ? line.slice(2) : line;
}

describe("ResultsRow column alignment", () => {
  it("pads columns by visual width for CJK text", () => {
    const columns: readonly Columns.ResolvedColumn[] = [
      {
        attribute: "name",
        label: "Name",
        width: 6,
        value: () => "漢字",
      },
      {
        attribute: "status",
        label: "Status",
        width: 4,
        value: () => "ok",
      },
    ];

    const instance = render(
      <ResultsRow
        item={createWebhookItem()}
        selected={false}
        focused={false}
        columns={columns}
      />,
    );

    try {
      const content = getRowContent(instance.lastFrame());
      const { rest } = consumeByWidth(content, 6);
      expect(rest).toMatch(/^ {2}\S/);
    } finally {
      instance.cleanup();
    }
  });

  it("truncates wide text by visual width before padding", () => {
    const columns: readonly Columns.ResolvedColumn[] = [
      {
        attribute: "name",
        label: "Name",
        width: 5,
        value: () => "漢字漢字",
      },
      {
        attribute: "status",
        label: "Status",
        width: 4,
        value: () => "ok",
      },
    ];

    const instance = render(
      <ResultsRow
        item={createWebhookItem()}
        selected={false}
        focused={false}
        columns={columns}
      />,
    );

    try {
      const content = getRowContent(instance.lastFrame());
      const { consumed, rest } = consumeByWidth(content, 5);
      expect(stringWidth(consumed)).toBe(5);
      expect(consumed).toContain("...");
      expect(rest).toMatch(/^ {2}\S/);
    } finally {
      instance.cleanup();
    }
  });
});
