import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// Strip ANSI escape sequences from text
// Covers: CSI sequences, OSC sequences, simple escape sequences, and hyperlink sequences
// Uses string-based RegExp to avoid biome noControlCharactersInRegex lint error
const ANSI_PATTERN =
  "[\\u001B\\u009B](?:\\[\\??[\\d;]*[A-Za-z]|\\][\\d;]*(?:;[^\\u0007\\u001B]*)*(?:\\u0007|\\u001B\\\\)|[()#][A-Za-z0-9]|[A-Za-z])";

export function stripAnsi(text: string): string {
  return text.replace(new RegExp(ANSI_PATTERN, "g"), "");
}

export async function writeFrameToFile(
  frame: string,
  filePath: string,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, frame, "utf-8");
}
