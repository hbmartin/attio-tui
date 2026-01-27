import { Box, Text, useInput } from "ink";

interface KeyBindingHelp {
  readonly keys: string;
  readonly description: string;
}

interface KeyBindingSection {
  readonly title: string;
  readonly bindings: readonly KeyBindingHelp[];
}

const HELP_SECTIONS: readonly KeyBindingSection[] = [
  {
    title: "Navigation",
    bindings: [
      { keys: "j / ↓", description: "Move down" },
      { keys: "k / ↑", description: "Move up" },
      { keys: "h / ←", description: "Move left / Previous tab" },
      { keys: "l / →", description: "Move right / Next tab" },
      { keys: "Enter / Space", description: "Select item" },
      { keys: "Backspace", description: "Go back" },
      { keys: "G", description: "Jump to bottom" },
      { keys: "g g", description: "Jump to top" },
    ],
  },
  {
    title: "Pane Focus",
    bindings: [
      { keys: "Tab", description: "Next pane" },
      { keys: "Shift+Tab", description: "Previous pane" },
      { keys: "1", description: "Focus navigator" },
      { keys: "2", description: "Focus results" },
      { keys: "3", description: "Focus detail" },
    ],
  },
  {
    title: "Actions",
    bindings: [
      { keys: ":", description: "Open command palette" },
      { keys: "y", description: "Copy selected ID" },
      { keys: "Ctrl+O", description: "Open in browser" },
      { keys: "Ctrl+R", description: "Refresh data" },
      { keys: "Ctrl+D", description: "Toggle debug panel" },
    ],
  },
  {
    title: "Application",
    bindings: [
      { keys: "?", description: "Show/hide this help" },
      { keys: "Escape", description: "Close overlay / Go back" },
      { keys: "q", description: "Quit application" },
    ],
  },
];

interface HelpOverlayProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

function KeyBindingRow({ keys, description }: KeyBindingHelp) {
  return (
    <Box>
      <Box width={18}>
        <Text bold={true} color="cyan">
          {keys}
        </Text>
      </Box>
      <Text>{description}</Text>
    </Box>
  );
}

function HelpSection({ title, bindings }: KeyBindingSection) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold={true} underline={true} color="blue">
        {title}
      </Text>
      {bindings.map((binding) => (
        <KeyBindingRow
          key={binding.keys}
          keys={binding.keys}
          description={binding.description}
        />
      ))}
    </Box>
  );
}

export function HelpOverlay({ isOpen, onClose }: HelpOverlayProps) {
  useInput(
    (input, key) => {
      if (key.escape || input === "?" || input === "q") {
        onClose();
      }
    },
    { isActive: isOpen },
  );

  if (!isOpen) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="blue"
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold={true} color="blue">
          Keyboard Shortcuts
        </Text>
        <Text dimColor={true}>(Press ? or Esc to close)</Text>
      </Box>

      <Box flexDirection="row" gap={4}>
        <Box flexDirection="column">
          {HELP_SECTIONS.slice(0, 2).map((section) => (
            <HelpSection key={section.title} {...section} />
          ))}
        </Box>
        <Box flexDirection="column">
          {HELP_SECTIONS.slice(2).map((section) => (
            <HelpSection key={section.title} {...section} />
          ))}
        </Box>
      </Box>

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor={true}>
          Tip: Use the command palette (:) to search for commands and navigate
          to different sections.
        </Text>
      </Box>
    </Box>
  );
}
