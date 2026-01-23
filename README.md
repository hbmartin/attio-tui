# attio-tui

> Your CRM, but make it terminal.

[![npm version](https://img.shields.io/npm/v/attio-tui.svg)](https://www.npmjs.com/package/attio-tui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org)

A blazing-fast terminal UI for [Attio](https://attio.com) CRM. Browse companies, people, notes, tasks, and more — all without leaving your terminal. Built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs) and TypeScript.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  attio-tui                                                                  │
├──────────────┬──────────────────────────────────────┬───────────────────────┤
│  Navigator   │  Results                             │  Detail               │
│              │                                      │                       │
│  ▸ Companies │  Name          │ Domain    │ Stage  │  ┌─────┬──────┬─────┐ │
│    People    │  ────────────────────────────────    │  │ Sum │ JSON │ SDK │ │
│    Notes     │  ▸ Acme Corp   │ acme.io   │ Lead   │  └─────┴──────┴─────┘ │
│    Tasks     │    Globex      │ globex.co │ Opp    │                       │
│    Meetings  │    Initech     │ inite.ch  │ Won    │  Name: Acme Corp      │
│    Webhooks  │    Hooli       │ hooli.xyz │ Lead   │  Domain: acme.io      │
│              │                                      │  Stage: Lead          │
│              │                                      │  Owner: Jane Doe      │
├──────────────┴──────────────────────────────────────┴───────────────────────┤
│  : command palette  │  hjkl/arrows: navigate  │  Tab: switch pane  │  q: quit│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

- **Three-pane layout** — Navigator, Results, and Detail panes work together seamlessly
- **Vim-style navigation** — `hjkl` keys (and arrow keys for the unenlightened)
- **Command palette** — Press `:` and start typing. It's like Spotlight, but for your CRM
- **Webhook management** — Create, edit, and delete webhooks without leaving the terminal
- **Customizable columns** — Show the fields you care about, hide the ones you don't
- **Copy & export** — Copy IDs to clipboard, export records as JSON
- **Debug panel** — See exactly what's happening under the hood (Ctrl+D)

## Installation

```bash
# npm
npm install --global attio-tui

# pnpm (recommended)
pnpm add --global attio-tui

# yarn
yarn global add attio-tui
```

## Quick Start

```bash
# Run it
attio-tui

# First time? You'll be prompted for your Attio API key
# Get one from: Attio → Workspace Settings → Developers → API Keys
```

That's it. You're in.

## Keyboard Shortcuts

### Global

| Key | Action |
|-----|--------|
| `q` | Quit |
| `Tab` / `Shift+Tab` | Switch between panes |
| `1` / `2` / `3` | Jump to Navigator / Results / Detail |
| `:` | Open command palette |
| `y` | Copy selected item's ID (yank) |
| `Ctrl+O` | Open in browser |
| `Ctrl+R` | Refresh data |
| `Ctrl+D` | Toggle debug panel |
| `Escape` | Close palette / Go back |

### Navigation (in lists)

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `h` / `←` | Go left / back |
| `l` / `→` | Go right / into |
| `Enter` / `Space` | Select |
| `Backspace` | Go back |

### Detail Pane

| Key | Action |
|-----|--------|
| `h` / `l` | Previous / next tab |
| `j` / `k` | Scroll content |

## Command Palette

Press `:` to open the command palette, then start typing:

```
: companies     → Jump to Companies
: people        → Jump to People
: notes         → Jump to Notes
: tasks         → Jump to Tasks
: meetings      → Jump to Meetings
: webhooks      → Jump to Webhooks
: copy          → Copy ID to clipboard
: open          → Open in browser
: export        → Export as JSON
: columns       → Configure visible columns
: refresh       → Refresh current data
: debug         → Toggle debug panel
: quit          → Exit application
```

## Browse Your Data

### Companies & People

Browse your custom objects with configurable columns. Search, scroll, and dive into details.

### Notes, Tasks & Meetings

Stay on top of your activity stream. View notes, check off tasks, and see upcoming meetings.

### Webhooks

Full webhook management without the web UI:
- Create new webhooks with custom URLs and event subscriptions
- Edit existing webhook configurations
- Delete webhooks (with confirmation, we're not monsters)

## Configuration

Your config lives at:
- **macOS/Linux:** `~/.config/attio-tui/`
- **Windows:** `%APPDATA%\attio-tui\`

### Files

| File | Purpose |
|------|---------|
| `config.json` | API key and app settings |
| `columns.json` | Per-category column preferences |

All configs are validated with Zod on load — no mystery crashes from malformed JSON.

## CLI Options

```bash
attio-tui --help     # Show help
attio-tui --version  # Show version
attio-tui --debug    # Start with debug panel open
```

## Development

```bash
# Clone and install
git clone https://github.com/hbmartin/attio-tui.git
cd attio-tui
pnpm install

# Development mode (watch + rebuild)
pnpm dev

# Build
pnpm build

# Run the built app
node dist/cli.js

# Or link it globally for local testing
pnpm link --global
attio-tui

# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage

# Lint & format
pnpm lint
pnpm format

# Full verification (format + test + build)
pnpm format && pnpm test && pnpm build
```

### Project Structure

```
source/
├── app.tsx              # Main app component
├── cli.tsx              # CLI entry point
├── components/          # React components
│   ├── command-palette/ # Command search UI
│   ├── detail/          # Detail pane tabs
│   ├── layout/          # Pane layouts
│   ├── navigator/       # Category sidebar
│   ├── results/         # Data grid
│   └── webhooks/        # Webhook CRUD forms
├── hooks/               # React hooks
├── services/            # API service layer
├── state/               # State management
├── types/               # TypeScript types
└── utils/               # Utilities
```

### Tech Stack

- **[Ink](https://github.com/vadimdemedes/ink)** — React for the terminal
- **[attio-ts-sdk](https://github.com/hbmartin/attio-ts-sdk)** — Type-safe Attio API client
- **[Zod](https://zod.dev)** — Runtime validation
- **[Vitest](https://vitest.dev)** — Testing
- **[Biome](https://biomejs.dev)** — Linting & formatting

### Testing Strategy

- **Unit tests** — Pure logic with Vitest
- **Component tests** — Keyboard flows with ink-testing-library
- **Integration tests** — Real terminal simulation with node-pty

See [docs/testing.md](docs/testing.md) for the full testing philosophy.

## Troubleshooting

### "Command not found" after install

Make sure your global npm/pnpm bin is in your PATH:

```bash
# npm
export PATH="$PATH:$(npm config get prefix)/bin"

# pnpm
export PATH="$PATH:$(pnpm config get prefix)/bin"
```

### API key not working

1. Check you're using an API key, not an OAuth token
2. Ensure the key has read access to the data you're trying to view
3. Try regenerating the key in Attio workspace settings

### Garbled output

Your terminal might not support the characters we're using. Try:
- Using a modern terminal (iTerm2, Alacritty, Ghostty)
- Setting `TERM=xterm-256color`

## Contributing

Contributions welcome! Please:

1. Fork the repo
2. Create a feature branch
3. Write tests for new functionality
4. Run `pnpm format && pnpm test && pnpm build`
5. Open a PR

See [AGENTS.md](AGENTS.md) for coding guidelines.

## License

MIT © [Harold Martin](https://github.com/hbmartin)
