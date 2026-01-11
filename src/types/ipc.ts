// IPC (Inter-Process Communication) type definitions
// These types ensure type safety between the Rust backend and TypeScript frontend

// ==================== Commands (Frontend → Rust) ====================

/**
 * Options for spawning a new PTY session
 */
export interface SpawnPtyCommand {
  shell?: string;
  cols: number;
  rows: number;
  env?: Record<string, string>;
}

/**
 * Session information returned from spawn_pty
 */
export interface SessionInfo {
  id: string;
  pid: number;
  shell: string;
}

/**
 * Arguments for pty_write command
 */
export interface WritePtyCommand {
  sessionId: string;
  data: string;
}

/**
 * Arguments for pty_resize command
 */
export interface ResizePtyCommand {
  sessionId: string;
  cols: number;
  rows: number;
}

/**
 * Arguments for pty_close command
 */
export interface ClosePtyCommand {
  sessionId: string;
}

// ==================== Events (Rust → Frontend) ====================

/**
 * PTY data event - emitted when the PTY has output
 */
export interface PtyDataEvent {
  sessionId: string;
  data: string;
}

/**
 * PTY exit event - emitted when the shell process exits
 */
export interface PtyExitEvent {
  sessionId: string;
  exitCode: number;
}

// ==================== Error Types ====================

/**
 * Error response from PTY commands
 */
export interface PtyError {
  message: string;
}
