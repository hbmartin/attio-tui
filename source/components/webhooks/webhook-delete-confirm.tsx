import { Box, Text, useInput } from "ink";

interface WebhookDeleteConfirmProps {
  readonly webhookUrl: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly isDeleting: boolean;
}

export function WebhookDeleteConfirm({
  webhookUrl,
  onConfirm,
  onCancel,
  isDeleting,
}: WebhookDeleteConfirmProps) {
  useInput((input, key) => {
    if (isDeleting) {
      return;
    }

    if (key.escape || input === "n" || input === "N") {
      onCancel();
      return;
    }

    if (input === "y" || input === "Y") {
      onConfirm();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="red"
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1}>
        <Text bold={true} color="red">
          Delete Webhook
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text>Are you sure you want to delete this webhook?</Text>
        <Box marginTop={1}>
          <Text color="cyan">URL: </Text>
          <Text>{webhookUrl}</Text>
        </Box>
      </Box>

      <Box marginBottom={1}>
        <Text color="yellow">This action cannot be undone.</Text>
      </Box>

      <Box marginTop={1}>
        {isDeleting ? (
          <Text color="yellow">Deleting webhook...</Text>
        ) : (
          <Text>
            Press{" "}
            <Text color="red" bold={true}>
              Y
            </Text>{" "}
            to confirm,{" "}
            <Text color="green" bold={true}>
              N
            </Text>{" "}
            or Esc to cancel
          </Text>
        )}
      </Box>
    </Box>
  );
}
