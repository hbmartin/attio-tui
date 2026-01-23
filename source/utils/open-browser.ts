import { spawn } from "node:child_process";
import process from "node:process";

interface OpenBrowserOptions {
  readonly url: string;
}

interface CommandSpec {
  readonly command: string;
  readonly args: readonly string[];
}

function getOpenCommand(platform: NodeJS.Platform, url: string): CommandSpec {
  if (platform === "darwin") {
    return { command: "open", args: [url] };
  }
  if (platform === "win32") {
    return { command: "cmd", args: ["/c", "start", "", url] };
  }
  return { command: "xdg-open", args: [url] };
}

export async function openBrowser({ url }: OpenBrowserOptions): Promise<void> {
  const commandSpec = getOpenCommand(process.platform, url);
  const { command, args } = commandSpec;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "ignore",
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Open command exited with code ${code ?? 1}`));
      }
    });
  });
}
