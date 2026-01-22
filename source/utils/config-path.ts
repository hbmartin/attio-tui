import { homedir } from "node:os";
import { join } from "node:path";

// Config directory name
const CONFIG_DIR_NAME = ".attio-tui";

// Config file names
const CONFIG_FILE_NAME = "config.json";
const COLUMNS_FILE_NAME = "columns.json";

// Get the config directory path (~/.attio-tui)
export function getConfigDir(): string {
  return join(homedir(), CONFIG_DIR_NAME);
}

// Get the main config file path (~/.attio-tui/config.json)
export function getConfigPath(): string {
  return join(getConfigDir(), CONFIG_FILE_NAME);
}

// Get the columns config file path (~/.attio-tui/columns.json)
export function getColumnsPath(): string {
  return join(getConfigDir(), COLUMNS_FILE_NAME);
}
