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
  const hasValue = trimmed.length > 0;
  const isValidUrl = (() => {
    if (!hasValue) {
      return false;
    }

    try {
      const parsed = new URL(trimmed);
      const hasHttpProtocol =
        parsed.protocol === "http:" || parsed.protocol === "https:";
      const hasHostname = parsed.hostname.trim().length > 0;

      return hasHttpProtocol && hasHostname;
    } catch {
      return false;
    }
  })();

  return {
    trimmed,
    hasValue,
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
          <Text color="yellow">
            URL must be a valid http:// or https:// address
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor={true}>Press Enter to continue to event selection</Text>
      </Box>
    </Box>
  );
}
