import { Box, Text } from "ink";

interface CommandInputProps {
  readonly value: string;
}

export function CommandInput({ value }: CommandInputProps) {
  return (
    <Box>
      <Text color="blue" bold={true}>
        :{" "}
      </Text>
      <Text>{value}</Text>
      <Text color="blue">|</Text>
    </Box>
  );
}
