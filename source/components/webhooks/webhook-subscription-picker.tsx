import { Box, Text, useInput } from "ink";
import { useState } from "react";
import {
  ALL_WEBHOOK_EVENTS,
  WEBHOOK_EVENT_CATEGORIES,
  type WebhookEventDefinition,
} from "../../constants/webhook-events.js";
import type { WebhookEventType } from "../../types/attio.js";

interface WebhookSubscriptionPickerProps {
  readonly selectedEvents: readonly WebhookEventType[];
  readonly onToggleEvent: (eventType: WebhookEventType) => void;
  readonly onNext: () => void;
}

export function WebhookSubscriptionPicker({
  selectedEvents,
  onToggleEvent,
  onNext,
}: WebhookSubscriptionPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const totalEvents = ALL_WEBHOOK_EVENTS.length;

  useInput((input, key) => {
    if (key.return) {
      if (selectedEvents.length > 0) {
        onNext();
      }
      return;
    }

    if (key.upArrow || input === "k") {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow || input === "j") {
      setSelectedIndex((prev) => Math.min(totalEvents - 1, prev + 1));
      return;
    }

    if (input === " ") {
      const event = ALL_WEBHOOK_EVENTS[selectedIndex];
      if (event) {
        onToggleEvent(event.value);
      }
      return;
    }

    // Select all events in current category
    if (input === "a") {
      let eventIndex = 0;
      for (const category of WEBHOOK_EVENT_CATEGORIES) {
        const categoryStart = eventIndex;
        const categoryEnd = eventIndex + category.events.length;
        if (selectedIndex >= categoryStart && selectedIndex < categoryEnd) {
          for (const event of category.events) {
            if (!selectedEvents.includes(event.value)) {
              onToggleEvent(event.value);
            }
          }
          break;
        }
        eventIndex = categoryEnd;
      }
    }
  });

  // Determine visible window (show 10 events at a time)
  const windowSize = 10;
  const windowStart = Math.max(
    0,
    Math.min(
      selectedIndex - Math.floor(windowSize / 2),
      totalEvents - windowSize,
    ),
  );
  const windowEnd = Math.min(totalEvents, windowStart + windowSize);

  // Build visible items with category headers
  interface WebhookCategoryItem {
    readonly type: "category";
    readonly label: string;
  }

  interface WebhookEventItem {
    readonly type: "event";
    readonly event: WebhookEventDefinition;
    readonly globalIndex: number;
  }

  type VisibleItem = WebhookCategoryItem | WebhookEventItem;

  const visibleItems: VisibleItem[] = [];

  let globalIndex = 0;
  for (const category of WEBHOOK_EVENT_CATEGORIES) {
    const categoryStart = globalIndex;
    const categoryEnd = globalIndex + category.events.length;

    // Check if any events from this category are in the visible window
    if (categoryEnd > windowStart && categoryStart < windowEnd) {
      // Add category header if first event is visible or we're starting mid-category
      if (
        categoryStart >= windowStart ||
        (categoryStart < windowStart && windowStart < categoryEnd)
      ) {
        visibleItems.push({ type: "category", label: category.name });
      }

      for (const event of category.events) {
        if (globalIndex >= windowStart && globalIndex < windowEnd) {
          visibleItems.push({
            type: "event",
            event,
            globalIndex,
          });
        }
        globalIndex += 1;
      }
    } else {
      globalIndex = categoryEnd;
    }
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>Select event types to subscribe to:</Text>
        <Text dimColor={true}> ({selectedEvents.length} selected)</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {visibleItems.map((item, idx) => {
          if (item.type === "category") {
            return (
              <Box key={`cat-${item.label}-${idx}`}>
                <Text bold={true} color="yellow">
                  {item.label}
                </Text>
              </Box>
            );
          }

          const isSelected = selectedEvents.includes(item.event.value);
          const isCursor = item.globalIndex === selectedIndex;
          const checkbox = isSelected ? "[x]" : "[ ]";

          return (
            <Box key={item.event.value}>
              <Text color={isCursor ? "cyan" : undefined}>
                {isCursor ? "> " : "  "}
              </Text>
              <Text color={isSelected ? "green" : undefined}>
                {checkbox} {item.event.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      {windowStart > 0 && (
        <Text dimColor={true}>... {windowStart} more above</Text>
      )}
      {windowEnd < totalEvents && (
        <Text dimColor={true}>... {totalEvents - windowEnd} more below</Text>
      )}

      <Box marginTop={1}>
        <Text dimColor={true}>
          j/k or arrows: Navigate | Space: Toggle | a: Select category | Enter:
          Continue
        </Text>
      </Box>
    </Box>
  );
}
