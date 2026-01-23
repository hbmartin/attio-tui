import { Box, Text, useInput } from "ink";
import { getEventLabel } from "../../constants/webhook-events.js";

interface WebhookReviewStepProps {
  readonly targetUrl: string;
  readonly selectedEvents: readonly string[];
  readonly onSubmit: () => void;
  readonly isSubmitting: boolean;
  readonly mode: "create" | "edit";
}

export function WebhookReviewStep({
  targetUrl,
  selectedEvents,
  onSubmit,
  isSubmitting,
  mode,
}: WebhookReviewStepProps) {
  useInput((_input, key) => {
    if (key.return && !isSubmitting) {
      onSubmit();
    }
  });

  const actionVerb = mode === "create" ? "Create" : "Update";

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>Review your webhook configuration:</Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Box>
          <Text color="cyan" bold={true}>
            Target URL:{" "}
          </Text>
          <Text>{targetUrl}</Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text color="cyan" bold={true}>
            Subscribed Events ({selectedEvents.length}):
          </Text>
          <Box flexDirection="column" marginLeft={2}>
            {selectedEvents.slice(0, 8).map((eventValue) => (
              <Text key={eventValue}>- {getEventLabel(eventValue)}</Text>
            ))}
            {selectedEvents.length > 8 && (
              <Text dimColor={true}>
                ... and {selectedEvents.length - 8} more
              </Text>
            )}
          </Box>
        </Box>
      </Box>

      <Box marginTop={1}>
        {isSubmitting ? (
          <Text color="yellow">
            {mode === "create" ? "Creating" : "Updating"} webhook...
          </Text>
        ) : (
          <Text color="green" bold={true}>
            Press Enter to {actionVerb} Webhook
          </Text>
        )}
      </Box>
    </Box>
  );
}
