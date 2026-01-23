#!/usr/bin/env node
import process from "node:process";
import { render } from "ink";
import meow from "meow";
import App from "./app.js";

const ptyDebugRaw = process.env["ATTIO_TUI_PTY_DEBUG"];
const ptyDebugEnabled =
  ptyDebugRaw === "1" || ptyDebugRaw?.toLowerCase() === "true";

const logPtyDebug = (message: string): void => {
  if (!ptyDebugEnabled) {
    return;
  }
  process.stderr.write(`[PTY-DEBUG] ${message}\n`);
};

const cli = meow(
  `
	Usage
	  $ attio-tui

	Options
		--debug  Enable debug mode

	Navigation
		Tab/Shift+Tab  Switch between panes
		j/k            Navigate up/down
		h/l            Navigate left/right
		Enter          Select item
		:              Open command palette
		q              Quit
`,
  {
    importMeta: import.meta,
    flags: {
      debug: {
        type: "boolean",
        default: false,
      },
    },
  },
);

if (ptyDebugEnabled) {
  logPtyDebug(`pid=${process.pid}`);
  logPtyDebug(
    `node=${process.version} platform=${process.platform} arch=${process.arch}`,
  );
  logPtyDebug(`cwd=${process.cwd()}`);
  logPtyDebug(`argv=${JSON.stringify(process.argv)}`);
  logPtyDebug(
    `tty stdin=${Boolean(process.stdin.isTTY)} stdout=${Boolean(process.stdout.isTTY)} stderr=${Boolean(process.stderr.isTTY)}`,
  );
  logPtyDebug(
    `env=${JSON.stringify({
      CI: process.env["CI"],
      TERM: process.env["TERM"],
      TERM_PROGRAM: process.env["TERM_PROGRAM"],
      COLORTERM: process.env["COLORTERM"],
      NO_COLOR: process.env["NO_COLOR"],
      FORCE_COLOR: process.env["FORCE_COLOR"],
    })}`,
  );
  logPtyDebug(`flags.debug=${String(cli.flags.debug)}`);
  process.on("uncaughtException", (error) => {
    logPtyDebug(
      `uncaughtException: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
    );
  });
  process.on("unhandledRejection", (reason) => {
    logPtyDebug(
      `unhandledRejection: ${reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)}`,
    );
  });
}

const app = render(<App initialDebugEnabled={cli.flags.debug} />);
if (ptyDebugEnabled) {
  app
    .waitUntilExit()
    .then(() => {
      logPtyDebug("render exit");
    })
    .catch((error) => {
      logPtyDebug(
        `render exit error: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
}
