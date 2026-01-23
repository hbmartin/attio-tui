import process from "node:process";

// biome-ignore lint/style/noNamespace: Use a namespace to group PTY debug helpers.
export namespace PtyDebug {
  export function isEnabled(): boolean {
    const raw = process.env["ATTIO_TUI_PTY_DEBUG"];
    if (!raw) {
      return false;
    }
    return raw === "1" || raw.toLowerCase() === "true";
  }

  export function log(message: string): void {
    if (!isEnabled()) {
      return;
    }
    process.stderr.write(`[PTY-DEBUG] ${message}\n`);
  }
}
