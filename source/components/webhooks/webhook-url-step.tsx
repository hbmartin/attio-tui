import { Box, Text, useInput } from "ink";

interface WebhookUrlStepProps {
  readonly value: string;
  readonly onChange: (url: string) => void;
  readonly onNext: () => void;
}

export interface WebhookUrlValidationResult {
  readonly trimmed: string;
  readonly hasValue: boolean;
  readonly isValidUrl: boolean;
}

export function getWebhookUrlValidation(
  value: string,
): WebhookUrlValidationResult {
  const trimmed = value.trim();
  const isValidUrl =
    trimmed.startsWith("http://") || trimmed.startsWith("https://");

  return {
    trimmed,
    hasValue: trimmed.length > 0,
    isValidUrl,
  };
}

export function WebhookUrlStep({
  value,
  onChange,
  onNext,
}: WebhookUrlStepProps) {
  const { trimmed, hasValue, isValidUrl } = getWebhookUrlValidation(value);

  useInput((input, key) => {
    if (key.return) {
      if (hasValue && isValidUrl) {
        if (trimmed !== value) {
          onChange(trimmed);
        }
        onNext();
      }
      return;
    }

    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      return;
    }

    if (input && !key.ctrl && !key.meta && !key.escape && !key.tab) {
      onChange(value + input);
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>Enter the URL where webhook events will be delivered:</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="cyan">URL: </Text>
        <Text>{value}</Text>
        <Text color="cyan">|</Text>
      </Box>

      {hasValue && !isValidUrl && (
        <Box marginBottom={1}>
          <Text color="yellow">URL should start with http:// or https://</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor={true}>Press Enter to continue to event selection</Text>
      </Box>
    </Box>
  );
}
