// Settings and configuration type definitions
// Windows Terminal-inspired JSON configuration model

// ==================== Color Schemes ====================

/**
 * Color scheme definition
 * Based on Windows Terminal color scheme structure
 */
export interface ColorScheme {
  id: string;
  name: string;

  // ANSI colors (normal)
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;

  // ANSI colors (bright)
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;

  // Interface colors
  foreground: string;
  background: string;
  cursorColor: string;
  selectionBackground: string;
}

// ==================== Profiles ====================

/**
 * Shell profile definition
 */
export interface Profile {
  id: string;
  name: string;
  shell: string;
  args?: string[];
  env?: Record<string, string>;
  colorSchemeId?: string;
  startingDirectory?: string;
  tabTitle?: string;
  icon?: string;
}

// ==================== Key Bindings ====================

/**
 * Mouse action types
 */
export type MouseAction = 
  | 'rightClick'
  | 'middleClick'
  | 'doubleClick'
  | 'tripleClick'
  | 'ctrlClick'
  | 'shiftClick'
  | 'altClick';

/**
 * Key binding definition - supports multiple keys for one command
 */
export interface KeyBinding {
  id: string;
  name: string;
  command: string;
  keys: string[]; // Multiple keyboard shortcuts, e.g., ["ctrl+v", "ctrl+shift+v"]
  mouseActions?: MouseAction[]; // Mouse actions that trigger this command
  args?: Record<string, unknown>;
  when?: string; // Context when binding is active, e.g., "terminalFocus"
}

/**
 * Terminal-specific settings
 */
export interface TerminalSettings {
  // Behavior
  copyOnSelect: boolean;
  rightClickAction: 'paste' | 'contextMenu' | 'selectWord';
  middleClickAction: 'paste' | 'none';
  scrollSensitivity: number;
  
  // Bell
  bellStyle: 'none' | 'audio' | 'visual' | 'both';
  bellSound?: string;
  
  // Selection
  wordSeparators: string;
  tripleClickSelectsLine: boolean;
  
  // Links
  linkHandler: 'auto' | 'click' | 'ctrlClick';
  
  // Performance
  rendererType: 'canvas' | 'webgl' | 'dom';
  gpuAcceleration: boolean;
}

// ==================== Settings ====================

/**
 * Main settings structure
 */
export interface Settings {
  profiles: Profile[];
  colorSchemes: ColorScheme[];
  keyBindings: KeyBinding[];

  // Active selections
  activeProfileId: string | null;
  activeColorSchemeId: string | null;

  // Appearance settings
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  fontWeightBold: number;
  lineHeight: number;
  letterSpacing: number;
  cursorStyle: 'bar' | 'block' | 'underline';
  cursorBlink: boolean;
  cursorWidth: number;
  
  // Terminal behavior
  terminal: TerminalSettings;

  // Advanced settings
  scrollbackSize: number;
  tabWidth: number;
}

/**
 * Default settings
 */
export const defaultSettings: Settings = {
  profiles: [
    {
      id: 'bash',
      name: 'Bash',
      shell: '/bin/bash',
      colorSchemeId: 'default',
    },
    {
      id: 'zsh',
      name: 'Zsh',
      shell: '/bin/zsh',
      colorSchemeId: 'default',
    },
  ],
  colorSchemes: [
    {
      id: 'default',
      name: 'Default',
      black: '#0c0c0c',
      red: '#c50f1f',
      green: '#13a10e',
      yellow: '#c19c00',
      blue: '#0037da',
      magenta: '#881798',
      cyan: '#3a96dd',
      white: '#cccccc',
      brightBlack: '#767676',
      brightRed: '#e74856',
      brightGreen: '#16c60c',
      brightYellow: '#f9f1a5',
      brightBlue: '#3b78ff',
      brightMagenta: '#b4009e',
      brightCyan: '#61d6d6',
      brightWhite: '#f2f2f2',
      foreground: '#cccccc',
      background: '#0c0c0c',
      cursorColor: '#ffffff',
      selectionBackground: '#ffffff',
    },
    {
      id: 'solarized-dark',
      name: 'Solarized Dark',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#002b36',
      brightRed: '#cb4b16',
      brightGreen: '#586e75',
      brightYellow: '#657b83',
      brightBlue: '#839496',
      brightMagenta: '#6c71c4',
      brightCyan: '#93a1a1',
      brightWhite: '#fdf6e3',
      foreground: '#839496',
      background: '#002b36',
      cursorColor: '#839496',
      selectionBackground: '#073642',
    },
  ],
  keyBindings: [
    {
      id: 'new-tab',
      name: 'New Tab',
      command: 'newTab',
      keys: ['ctrl+shift+t'],
    },
    {
      id: 'close-tab',
      name: 'Close Tab',
      command: 'closeTab',
      keys: ['ctrl+shift+w'],
    },
    {
      id: 'command-palette',
      name: 'Command Palette',
      command: 'openCommandPalette',
      keys: ['ctrl+shift+p'],
    },
    // Copy & Paste - multiple bindings per command
    {
      id: 'copy',
      name: 'Copy',
      command: 'copy',
      keys: ['ctrl+c', 'ctrl+shift+c'],
      when: 'terminalTextSelected',
    },
    {
      id: 'paste',
      name: 'Paste',
      command: 'paste',
      keys: ['ctrl+v', 'ctrl+shift+v'],
      mouseActions: ['rightClick'],
    },
    {
      id: 'select-all',
      name: 'Select All',
      command: 'selectAll',
      keys: ['ctrl+shift+a'],
    },
    // Tab navigation
    {
      id: 'next-tab',
      name: 'Next Tab',
      command: 'nextTab',
      keys: ['ctrl+tab', 'ctrl+pagedown'],
    },
    {
      id: 'prev-tab',
      name: 'Previous Tab',
      command: 'prevTab',
      keys: ['ctrl+shift+tab', 'ctrl+pageup'],
    },
    // Pane management
    {
      id: 'split-vertical',
      name: 'Split Vertical',
      command: 'splitPane',
      keys: ['alt+shift+plus', 'alt+shift+='],
      args: { direction: 'vertical' },
    },
    {
      id: 'split-horizontal',
      name: 'Split Horizontal',
      command: 'splitPane',
      keys: ['alt+shift+minus', 'alt+shift+-'],
      args: { direction: 'horizontal' },
    },
    {
      id: 'close-pane',
      name: 'Close Pane',
      command: 'closePane',
      keys: ['ctrl+shift+w'],
    },
    // Zoom
    {
      id: 'zoom-in',
      name: 'Zoom In',
      command: 'zoomIn',
      keys: ['ctrl+plus', 'ctrl+=', 'ctrl+shift+plus'],
    },
    {
      id: 'zoom-out',
      name: 'Zoom Out',
      command: 'zoomOut',
      keys: ['ctrl+minus', 'ctrl+-'],
    },
    {
      id: 'zoom-reset',
      name: 'Reset Zoom',
      command: 'zoomReset',
      keys: ['ctrl+0'],
    },
    // Search
    {
      id: 'find',
      name: 'Find',
      command: 'openSearch',
      keys: ['ctrl+shift+f', 'ctrl+f'],
    },
    // Scrolling
    {
      id: 'scroll-up-page',
      name: 'Scroll Up Page',
      command: 'scrollUpPage',
      keys: ['shift+pageup'],
    },
    {
      id: 'scroll-down-page',
      name: 'Scroll Down Page',
      command: 'scrollDownPage',
      keys: ['shift+pagedown'],
    },
    {
      id: 'scroll-to-top',
      name: 'Scroll to Top',
      command: 'scrollToTop',
      keys: ['ctrl+home'],
    },
    {
      id: 'scroll-to-bottom',
      name: 'Scroll to Bottom',
      command: 'scrollToBottom',
      keys: ['ctrl+end'],
    },
    // Settings & Plugins
    {
      id: 'open-settings',
      name: 'Open Settings',
      command: 'openSettings',
      keys: ['ctrl+comma'],
    },
    {
      id: 'open-plugins',
      name: 'Open Plugins',
      command: 'openPlugins',
      keys: ['ctrl+shift+e'],
    },
    // Clear
    {
      id: 'clear-terminal',
      name: 'Clear Terminal',
      command: 'clear',
      keys: ['ctrl+l'],
    },
  ],
  activeProfileId: 'zsh',
  activeColorSchemeId: 'default',
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'MesloLGS NF, JetBrainsMono Nerd Font, FiraCode Nerd Font, Hack Nerd Font, monospace',
  fontWeight: 400,
  fontWeightBold: 700,
  lineHeight: 1.2,
  letterSpacing: 0,
  cursorStyle: 'block',
  cursorBlink: true,
  cursorWidth: 2,
  scrollbackSize: 10000,
  tabWidth: 4,
  terminal: {
    copyOnSelect: false,
    rightClickAction: 'paste',
    middleClickAction: 'paste',
    scrollSensitivity: 1,
    bellStyle: 'none',
    wordSeparators: ' ()[]{}\'",;:',
    tripleClickSelectsLine: true,
    linkHandler: 'ctrlClick',
    rendererType: 'webgl',
    gpuAcceleration: true,
  },
};
