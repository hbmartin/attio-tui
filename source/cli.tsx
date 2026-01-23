#!/usr/bin/env node
import { render } from "ink";
import meow from "meow";
import App from "./app.js";

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

render(<App initialDebugEnabled={cli.flags.debug} />);
