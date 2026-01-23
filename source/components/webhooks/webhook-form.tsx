import { Box, Text, useInput } from "ink";
import type { WebhookEventType } from "../../types/attio.js";
import type { WebhookFormStep } from "../../types/navigation.js";
import { WebhookReviewStep } from "./webhook-review-step.js";
import { WebhookSubscriptionPicker } from "./webhook-subscription-picker.js";
import { WebhookUrlStep } from "./webhook-url-step.js";

interface WebhookFormProps {
  readonly mode: "create" | "edit";
  readonly step: WebhookFormStep;
  readonly targetUrl: string;
  readonly selectedEvents: readonly WebhookEventType[];
  readonly onUrlChange: (url: string) => void;
  readonly onToggleEvent: (eventType: WebhookEventType) => void;
  readonly onNavigateStep: (direction: "next" | "previous") => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
  readonly isSubmitting: boolean;
  readonly error?: string;
}

const STEP_TITLES: Record<WebhookFormStep, string> = {
  url: "Target URL",
  subscriptions: "Event Subscriptions",
  review: "Review & Submit",
};

export function WebhookForm({
  mode,
  step,
  targetUrl,
  selectedEvents,
  onUrlChange,
  onToggleEvent,
  onNavigateStep,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: WebhookFormProps) {
  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    // Tab to go to next step (when not on review)
    if (key.tab && !key.shift && step !== "review") {
      onNavigateStep("next");
      return;
    }

    // Shift+Tab to go to previous step (when not on url)
    if (key.tab && key.shift && step !== "url") {
      onNavigateStep("previous");
      return;
    }
  });

  const title = mode === "create" ? "Create Webhook" : "Edit Webhook";
  const stepIndexMap: Record<typeof step, number> = {
    url: 1,
    subscriptions: 2,
    review: 3,
  };
  const stepIndex = stepIndexMap[step];

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold={true} color="cyan">
          {title}
        </Text>
        <Text dimColor={true}>
          Step {stepIndex}/3: {STEP_TITLES[step]}
        </Text>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {step === "url" && (
        <WebhookUrlStep
          value={targetUrl}
          onChange={onUrlChange}
          onNext={() => onNavigateStep("next")}
        />
      )}

      {step === "subscriptions" && (
        <WebhookSubscriptionPicker
          selectedEvents={selectedEvents}
          onToggleEvent={onToggleEvent}
          onNext={() => onNavigateStep("next")}
        />
      )}

      {step === "review" && (
        <WebhookReviewStep
          targetUrl={targetUrl}
          selectedEvents={selectedEvents}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          mode={mode}
        />
      )}

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor={true}>
          Tab: Next step | Shift+Tab: Previous step | Esc: Cancel
        </Text>
      </Box>
    </Box>
  );
}
