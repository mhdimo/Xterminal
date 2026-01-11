# Xterminal

A modern, feature-rich terminal emulator for Linux, inspired by Windows Terminal. Built with Tauri, React, and xterm.js.

![Xterminal Screenshot](./docs/screenshot.png)

## Features

- **Tabs**: Multiple terminal tabs with drag-to-reorder support
- **Split Panes**: Horizontal and vertical split panes for multitasking
- **Profiles**: Customizable shell profiles with different settings
- **Color Schemes**: Built-in color schemes (Campbell, One Half Dark, Solarized, etc.)
- **Keyboard Shortcuts**: Windows Terminal-inspired keyboard shortcuts
- **Settings Persistence**: Settings saved to `~/.config/xterminal/settings.json`
- **Window State**: Window position and size remembered between sessions
- **Broadcast Mode**: Send input to all panes simultaneously
- **Search**: In-terminal search with regex support
- **Command Palette**: Quick access to all commands

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | New Tab |
| `Ctrl+Shift+W` | Close Tab |
| `Ctrl+Tab` | Next Tab |
| `Ctrl+Shift+Tab` | Previous Tab |
| `Alt+Shift+D` | Split Pane (vertical) |
| `Alt+Shift+-` | Split Pane (horizontal) |
| `Alt+Shift+=` | Split Pane (vertical) |
| `Alt+Shift+W` | Close Pane |
| `Alt+Arrow Keys` | Navigate between panes |
| `Ctrl+Shift+C` | Copy selection |
| `Ctrl+Shift+V` | Paste |
| `Ctrl+Shift+F` | Search in terminal |
| `Ctrl+Shift+P` | Command Palette |
| `Alt+Shift+B` | Toggle Broadcast Mode |
| `Ctrl+,` | Open Settings |

## Installation

### Prerequisites

- [Bun](https://bun.sh) v1.3.5+
- [Rust](https://rustup.rs/) 1.75+
- Linux with GTK 3 development libraries

### Build from Source

```bash
# Install dependencies
bun install

# Run in development mode
bun tauri:dev

# Build for production
bun tauri:build
```

The built application will be in `src-tauri/target/release/`.

## Development

```bash
# Run development server (frontend only)
bun dev

# Run Tauri development (full app)
bun tauri:dev

# Run tests
bun test

# Run tests in watch mode
bun test:watch
```

## Configuration

Settings are stored in `~/.config/xterminal/settings.json`.

### Profiles

Profiles define shell configurations:

```json
{
  "profiles": [
    {
      "id": "default",
      "name": "Default",
      "commandline": "/bin/bash",
      "colorScheme": "One Half Dark",
      "isDefault": true
    }
  ]
}
```

### Color Schemes

Built-in color schemes include:
- Campbell (default)
- One Half Dark
- One Half Light
- Solarized Dark
- Solarized Light
- Vintage

## Architecture

- **Frontend**: React 19 + Zustand + TailwindCSS
- **Terminal**: xterm.js with addons (fit, search, web-links)
- **Backend**: Tauri 2.0 with Rust
- **PTY**: portable-pty for cross-platform PTY support

## Project Structure

```
├── src/                    # Frontend React code
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── store/              # Zustand state stores
│   └── types/              # TypeScript types
├── src-tauri/              # Tauri/Rust backend
│   └── src/
│       ├── commands/       # Tauri IPC commands
│       └── pty/            # PTY session management
├── styles/                 # Global CSS
└── tests/                  # Test files
```

## License

MIT
