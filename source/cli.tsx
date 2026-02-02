#!/usr/bin/env node
import process from "node:process";
import { withFullScreen } from "fullscreen-ink";
import meow from "meow";
import App from "./app.js";
import { errorToDebugString } from "./utils/error-messages.js";
import { PtyDebug } from "./utils/pty-debug.js";

const cli = meow(
  `
	Usage
	  $ attio-tui

	Options
		--debug    Enable debug panel + PTY logging
		--verbose  Enable PTY logging

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
      verbose: {
        type: "boolean",
        default: false,
      },
    },
  },
);

const shouldEnablePtyDebug = cli.flags.debug || cli.flags.verbose;
if (shouldEnablePtyDebug) {
  process.env["ATTIO_TUI_PTY_DEBUG"] = "1";
}
const ptyDebugEnabled = PtyDebug.isEnabled();

if (ptyDebugEnabled) {
  PtyDebug.log(`pid=${process.pid}`);
  PtyDebug.log(
    `node=${process.version} platform=${process.platform} arch=${process.arch}`,
  );
  PtyDebug.log(`cwd=${process.cwd()}`);
  PtyDebug.log(`argv=${JSON.stringify(process.argv)}`);
  PtyDebug.log(
    `tty stdin=${Boolean(process.stdin.isTTY)} stdout=${Boolean(process.stdout.isTTY)} stderr=${Boolean(process.stderr.isTTY)}`,
  );
  PtyDebug.log(
    `stdout columns=${process.stdout.columns ?? "<unset>"} rows=${process.stdout.rows ?? "<unset>"}`,
  );
  PtyDebug.log(`stdin isRaw=${String(process.stdin.isRaw)}`);
  PtyDebug.log(
    `env=${JSON.stringify({
      CI: process.env["CI"],
      TERM: process.env["TERM"],
      TERM_PROGRAM: process.env["TERM_PROGRAM"],
      COLORTERM: process.env["COLORTERM"],
      NO_COLOR: process.env["NO_COLOR"],
      FORCE_COLOR: process.env["FORCE_COLOR"],
    })}`,
  );
  PtyDebug.log(
    `flags.debug=${String(cli.flags.debug)} flags.verbose=${String(cli.flags.verbose)}`,
  );
  process.on("uncaughtException", (error) => {
    PtyDebug.log(`uncaughtException: ${errorToDebugString(error)}`);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    PtyDebug.log(`unhandledRejection: ${errorToDebugString(reason)}`);
    process.exit(1);
  });
}

if (ptyDebugEnabled) {
  PtyDebug.log("render start");
}
const ink = withFullScreen(<App initialDebugEnabled={cli.flags.debug} />);
ink.start().catch((error: unknown) => {
  const message = errorToDebugString(error);
  PtyDebug.log(`start error: ${message}`);
  process.stderr.write(`start error: ${message}\n`);
  process.exit(1);
});
if (ptyDebugEnabled) {
  PtyDebug.log("render returned");
  ink
    .waitUntilExit()
    .then(() => {
      PtyDebug.log("render exit");
    })
    .catch((error: unknown) => {
      PtyDebug.log(`render exit error: ${errorToDebugString(error)}`);
    });
}
