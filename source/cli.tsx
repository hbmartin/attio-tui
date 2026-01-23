#!/usr/bin/env node
import process from "node:process";
import { render } from "ink";
import meow from "meow";
import App from "./app.js";
import { PtyDebug } from "./utils/pty-debug.js";

const ptyDebugEnabled = PtyDebug.isEnabled();

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
  PtyDebug.log(`flags.debug=${String(cli.flags.debug)}`);
  process.on("uncaughtException", (error) => {
    PtyDebug.log(
      `uncaughtException: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
    );
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    PtyDebug.log(
      `unhandledRejection: ${reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)}`,
    );
    process.exit(1);
  });
}

if (ptyDebugEnabled) {
  PtyDebug.log("render start");
}
const app = render(<App initialDebugEnabled={cli.flags.debug} />);
if (ptyDebugEnabled) {
  PtyDebug.log("render returned");
  app
    .waitUntilExit()
    .then(() => {
      PtyDebug.log("render exit");
    })
    .catch((error) => {
      PtyDebug.log(
        `render exit error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
      );
    });
}
