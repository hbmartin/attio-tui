import { spawn } from "node:child_process";
import process from "node:process";

interface ClipboardWriteOptions {
  readonly text: string;
}

interface CommandSpec {
  readonly command: string;
  readonly args: readonly string[];
}

function getClipboardCommand(
  platform: NodeJS.Platform,
): CommandSpec | undefined {
  if (platform === "darwin") {
    return { command: "pbcopy", args: [] };
  }
  if (platform === "linux") {
    return { command: "xclip", args: ["-selection", "clipboard"] };
  }
  return;
}

export async function writeToClipboard({
  text,
}: ClipboardWriteOptions): Promise<void> {
  const commandSpec = getClipboardCommand(process.platform);
  if (!commandSpec) {
    throw new Error(`Clipboard not supported on ${process.platform}`);
  }
  const { command, args } = commandSpec;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "ignore", "pipe"],
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.stderr?.on("data", (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        reject(new Error(message));
      }
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Clipboard command exited with code ${code ?? 1}`));
      }
    });

    child.stdin?.write(text, (error) => {
      if (error) {
        reject(error);
        return;
      }
      child.stdin?.end();
    });
  });
}
