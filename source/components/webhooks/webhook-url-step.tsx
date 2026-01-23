import { Box, Text, useInput } from "ink";

interface WebhookUrlStepProps {
  readonly value: string;
  readonly onChange: (url: string) => void;
  readonly onNext: () => void;
}

export function WebhookUrlStep({
  value,
  onChange,
  onNext,
}: WebhookUrlStepProps) {
  useInput((input, key) => {
    if (key.return) {
      if (value.trim()) {
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

  const isValidUrl =
    value.startsWith("http://") || value.startsWith("https://");
  const hasValue = value.trim().length > 0;

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
