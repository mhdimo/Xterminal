
# Xterminal Development Guide

A modern terminal emulator for Linux built with Tauri 2.x, React 19, and xterm.js.

## Project Overview

- **Frontend**: React 19 + Zustand for state management
- **Backend**: Tauri 2.x with Rust for PTY management
- **Terminal**: xterm.js with fit, search, and web-links addons
- **UI**: TailwindCSS with react-resizable-panels for split panes

## Key Architecture

### State Management (Zustand Stores)
- `paneStore`: Manages binary tree of panes/splits
- `tabStore`: Manages terminal tabs
- `sessionStore`: Tracks PTY sessions
- `settingsStore`: Settings with auto-save to disk

### PTY Communication
- PTY sessions managed in Rust (`src-tauri/src/pty/session.rs`)
- Events emitted via Tauri: `pty://{sessionId}/data` and `pty://{sessionId}/exit`
- Frontend hook: `usePty.ts` handles spawning, writing, resizing

### Settings Persistence
- Settings saved to `~/.config/xterminal/settings.json`
- Window state saved to `~/.config/xterminal/window-state.json`
- Uses debounced auto-save (500ms)

## Common Commands

```bash
# Development
bun tauri:dev         # Run full app in dev mode
bun dev               # Run frontend only
bun test              # Run tests
bun test:watch        # Run tests in watch mode

# Production
bun tauri:build       # Build production app
```

## Key Keyboard Shortcuts

- `Alt+Shift+D` - Split pane vertically
- `Alt+Shift+-` - Split pane horizontally
- `Alt+Shift+W` - Close pane
- `Alt+Arrows` - Navigate panes
- `Ctrl+Shift+C/V` - Copy/Paste

## Important Notes

- react-resizable-panels v4.x uses `orientation` prop (not `direction`)
- Pane tree is a binary tree: each branch has `first` and `second` children
- Settings changes trigger debounced auto-save automatically

---

## Bun-Specific Guidelines

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
