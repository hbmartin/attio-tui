import { Box, Text, useInput } from "ink";
import { z } from "zod";

interface WebhookUrlStepProps {
  readonly value: string;
  readonly onChange: (url: string) => void;
  readonly onNext: () => void;
}

export interface WebhookUrlValidationResult {
  readonly trimmed: string;
  readonly hasValue: boolean;
  readonly isValidUrl: boolean;
  readonly validationMessage: string | undefined;
}

const webhookUrlSchema = z
  .string()
  .min(1, { message: "URL is required" })
  .url({ message: "URL must be a valid URL" })
  .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
    message: "URL must use http/https",
  });

export function getWebhookUrlValidation(
  value: string,
): WebhookUrlValidationResult {
  const trimmed = value.trim();
  const hasValue = trimmed.length > 0;
  const parseResult = webhookUrlSchema.safeParse(trimmed);
  const validationMessage = parseResult.success
    ? undefined
    : parseResult.error.issues[0]?.message;

  return {
    trimmed,
    hasValue,
    isValidUrl: parseResult.success,
    validationMessage,
  };
}

export function WebhookUrlStep({
  value,
  onChange,
  onNext,
}: WebhookUrlStepProps) {
  const { trimmed, hasValue, isValidUrl, validationMessage } =
    getWebhookUrlValidation(value);

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

      {hasValue && !isValidUrl && validationMessage && (
        <Box marginBottom={1}>
          <Text color="yellow">{validationMessage}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor={true}>Press Enter to continue to event selection</Text>
      </Box>
    </Box>
  );
}
