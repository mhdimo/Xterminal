// Terminal and PTY type definitions

// ==================== Pane / Split Types ====================

/**
 * Split direction for panes
 */
export type SplitType = 'none' | 'horizontal' | 'vertical';

/**
 * Leaf pane node - contains an actual terminal
 */
export interface Pane {
  id: string;
  type: 'leaf';
  sessionId: string | null;
  size?: number; // Percentage (0-100)
  minSize?: number;
}

/**
 * Branch node - contains a split container
 */
export interface SplitContainer {
  id: string;
  type: 'branch';
  splitType: SplitType;
  first: string; // ID of first child (Pane or SplitContainer)
  second: string; // ID of second child (Pane or SplitContainer)
  size?: number; // Divider position (percentage 0-100)
}

/**
 * Any node in the pane tree
 */
export type PaneNode = Pane | SplitContainer;

// ==================== Tab Types ====================

/**
 * Tab definition
 */
export interface Tab {
  id: string;
  title: string;
  icon?: string;
  isActive: boolean;
  rootPaneId: string; // References the root pane in the pane tree
  readOnly?: boolean;
  color?: string; // Tab accent color
  hasBell?: boolean; // Bell indicator (activity/notification)
  profileId?: string; // Which profile was used to create this tab
}

// ==================== Session Types ====================

/**
 * PTY session status
 */
export type SessionStatus = 'active' | 'exited' | 'failed';

/**
 * PTY session information
 */
export interface PtySession {
  id: string;
  pid: number;
  shell: string;
  status: SessionStatus;
  exitCode?: number;
  cols: number;
  rows: number;
}

// ==================== Terminal Options ====================

/**
 * xterm.js terminal options
 */
export interface TerminalOptions {
  cols: number;
  rows: number;
  fontSize: number;
  fontFamily: string;
  cursorBlink: boolean;
  cursorStyle: 'bar' | 'block' | 'underline';
  scrollback: number;
  theme: TerminalTheme;
}

/**
 * xterm.js theme
 */
export interface TerminalTheme {
  foreground?: string;
  background?: string;
  cursor?: string;
  cursorAccent?: string;
  selectionBackground?: string;
  black?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  magenta?: string;
  cyan?: string;
  white?: string;
  brightBlack?: string;
  brightRed?: string;
  brightGreen?: string;
  brightYellow?: string;
  brightBlue?: string;
  brightMagenta?: string;
  brightCyan?: string;
  brightWhite?: string;
}
