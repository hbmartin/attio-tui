import { Box, Text } from "ink";
import type {
  DebugRequestLogEntry,
  DebugStateSnapshot,
  DebugTimingSnapshot,
} from "../../types/debug.js";
import { formatRelativeTime } from "../../utils/formatting.js";

interface DebugPanelProps {
  readonly requestLog: readonly DebugRequestLogEntry[];
  readonly timing: DebugTimingSnapshot;
  readonly state: DebugStateSnapshot;
  readonly ptyDebugEnabled: boolean;
  readonly ptyLogPath: string | undefined;
  readonly accessibleMode: boolean;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }
  return `${(durationMs / 1000).toFixed(2)}s`;
}

function formatUptime(uptimeMs: number): string {
  const totalSeconds = Math.floor(uptimeMs / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

function formatRequestLine(entry: DebugRequestLogEntry): string {
  const detail = entry.detail ? ` • ${entry.detail}` : "";
  const error =
    entry.errorMessage && entry.status === "error"
      ? ` • ${entry.errorMessage}`
      : "";
  return `${entry.label}${detail}${error}`;
}

export function DebugPanel({
  requestLog,
  timing,
  state,
  ptyDebugEnabled,
  ptyLogPath,
  accessibleMode,
}: DebugPanelProps) {
  const { appStartedAt } = timing;
  const {
    focusedPane,
    activeTab,
    commandPaletteOpen,
    resultsCount,
    selectedIndex,
    categoryLabel,
    navigatorLoading,
    resultsLoading,
    columnPickerOpen,
    webhookModalMode,
  } = state;
  const now = Date.now();
  const uptimeMs = Math.max(0, now - appStartedAt);
  const [lastRequest] = requestLog;
  const selectedDisplay = resultsCount === 0 ? 0 : selectedIndex + 1;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={1}
      paddingY={1}
      marginTop={1}
    >
      <Text bold={true} color="yellow">
        Debug Panel
      </Text>

      <Box flexDirection="column" marginTop={1}>
        <Text bold={true}>Configuration</Text>
        <Text dimColor={true}>
          PTY logging: {ptyDebugEnabled ? "enabled" : "disabled"}
        </Text>
        {ptyDebugEnabled && ptyLogPath && (
          <Text dimColor={true}>Log file: {ptyLogPath}</Text>
        )}
        <Text dimColor={true}>
          Accessible mode: {accessibleMode ? "on" : "off"}
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold={true}>Timing</Text>
        <Text dimColor={true}>Uptime: {formatUptime(uptimeMs)}</Text>
        {lastRequest ? (
          <Text dimColor={true}>
            Last request: {formatDuration(lastRequest.durationMs)} ·{" "}
            {formatRelativeTime(lastRequest.startedAt)}
          </Text>
        ) : (
          <Text dimColor={true}>Last request: -</Text>
        )}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold={true}>State</Text>
        <Text dimColor={true}>Pane: {focusedPane}</Text>
        <Text dimColor={true}>Tab: {activeTab}</Text>
        <Text dimColor={true}>
          Results: {selectedDisplay}/{resultsCount}
        </Text>
        <Text dimColor={true}>Category: {categoryLabel ?? "-"}</Text>
        <Text dimColor={true}>
          Command palette: {commandPaletteOpen ? "open" : "closed"}
        </Text>
        <Text dimColor={true}>
          Column picker: {columnPickerOpen ? "open" : "closed"}
        </Text>
        <Text dimColor={true}>Webhook modal: {webhookModalMode}</Text>
        <Text dimColor={true}>
          Loading: {navigatorLoading ? "nav" : "-"} /{" "}
          {resultsLoading ? "results" : "-"}
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold={true}>Requests</Text>
        {requestLog.length === 0 && (
          <Text dimColor={true}>No requests recorded yet.</Text>
        )}
        {requestLog.slice(0, 5).map((entry) => (
          <Box key={entry.id} gap={1}>
            <Text color={entry.status === "success" ? "green" : "red"}>
              {entry.status.toUpperCase()}
            </Text>
            <Text>{formatDuration(entry.durationMs)}</Text>
            <Text dimColor={true}>{formatRequestLine(entry)}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
