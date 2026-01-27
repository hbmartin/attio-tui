import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { isValidApiKey } from "../../schemas/config-schema.js";
import { PtyDebug } from "../../utils/pty-debug.js";

interface ApiKeyPromptProps {
  readonly onSubmit: (apiKey: string) => void;
  readonly error?: string;
}

export function ApiKeyPrompt({ onSubmit, error }: ApiKeyPromptProps) {
  const [apiKey, setApiKey] = useState("");
  const [validationError, setValidationError] = useState<string>();

  useEffect(() => {
    PtyDebug.log("api-key prompt mount");
    return () => {
      PtyDebug.log("api-key prompt unmount");
    };
  }, []);

  useInput((input, key) => {
    if (key.return) {
      const trimmedKey = apiKey.trim();

      if (!trimmedKey) {
        setValidationError("API key is required");
        return;
      }

      if (!isValidApiKey(trimmedKey)) {
        setValidationError("Invalid API key format");
        return;
      }

      setValidationError(undefined);
      onSubmit(trimmedKey);
      return;
    }

    if (key.backspace || key.delete) {
      setApiKey((prev) => prev.slice(0, -1));
      setValidationError(undefined);
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setApiKey((prev) => prev + input);
      setValidationError(undefined);
    }
  });

  const displayError = validationError ?? error;

  return (
    <Box flexDirection="column" padding={1} width="100%" height="100%">
      <Box marginBottom={1}>
        <Text bold={true}>Welcome to Attio TUI</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>
          To get started, please enter your Attio API key. You can find this in
          your Attio workspace settings under API.
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="blue">API Key: </Text>
        <Text>{apiKey.length > 0 ? "•".repeat(apiKey.length) : ""}</Text>
        <Text color="blue">|</Text>
      </Box>

      {displayError && (
        <Box>
          <Text color="red">{displayError}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor={true}>Press Enter to submit</Text>
      </Box>
    </Box>
  );
}
