// Plugin and Tool type definitions

export type PackageManager = 'npm' | 'pip' | 'cargo' | 'go' | 'binary' | 'apt' | 'brew';

export type PluginCategory = 
  | 'ai-assistant'
  | 'git'
  | 'files'
  | 'search'
  | 'monitoring'
  | 'editor'
  | 'shell'
  | 'utility'
  | 'docker'
  | 'networking';

export interface Plugin {
  id: string;
  name: string;
  description: string;
  category: PluginCategory;
  packageManager: PackageManager;
  packageName: string;
  command: string;  // Command to run the tool
  website?: string;
  icon?: string;
  version?: string;
}

export interface InstalledPlugin extends Plugin {
  installedAt: string;
  installedVersion: string;
}

// Available plugins catalog
export const pluginsCatalog: Plugin[] = [
  // AI Assistants
  {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'Anthropic\'s AI coding assistant for the terminal',
    category: 'ai-assistant',
    packageManager: 'npm',
    packageName: '@anthropic-ai/claude-code',
    command: 'claude',
    website: 'https://anthropic.com',
    icon: '🤖',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    description: 'Open-source AI coding assistant',
    category: 'ai-assistant',
    packageManager: 'npm',
    packageName: 'opencode',
    command: 'opencode',
    website: 'https://github.com/opencode-ai/opencode',
    icon: '💻',
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    description: 'OpenAI Codex command-line interface',
    category: 'ai-assistant',
    packageManager: 'npm',
    packageName: '@openai/codex',
    command: 'codex',
    website: 'https://openai.com',
    icon: '🧠',
  },
  {
    id: 'aider',
    name: 'Aider',
    description: 'AI pair programming in your terminal',
    category: 'ai-assistant',
    packageManager: 'pip',
    packageName: 'aider-chat',
    command: 'aider',
    website: 'https://aider.chat',
    icon: '👥',
  },
  
  // Git Tools
  {
    id: 'lazygit',
    name: 'Lazygit',
    description: 'Simple terminal UI for git commands',
    category: 'git',
    packageManager: 'binary',
    packageName: 'lazygit',
    command: 'lazygit',
    website: 'https://github.com/jesseduffield/lazygit',
    icon: '📦',
  },
  {
    id: 'delta',
    name: 'Delta',
    description: 'Syntax-highlighting pager for git, diff, and grep',
    category: 'git',
    packageManager: 'cargo',
    packageName: 'git-delta',
    command: 'delta',
    icon: 'Δ',
  },

  // File Management
  {
    id: 'yazi',
    name: 'Yazi',
    description: 'Blazing fast terminal file manager',
    category: 'files',
    packageManager: 'cargo',
    packageName: 'yazi-fm',
    command: 'yazi',
    website: 'https://yazi-rs.github.io',
    icon: '📁',
  },
  {
    id: 'eza',
    name: 'Eza',
    description: 'Modern replacement for ls',
    category: 'files',
    packageManager: 'cargo',
    packageName: 'eza',
    command: 'eza',
    icon: '📋',
  },
  {
    id: 'bat',
    name: 'Bat',
    description: 'Cat clone with syntax highlighting',
    category: 'files',
    packageManager: 'cargo',
    packageName: 'bat',
    command: 'bat',
    icon: '🦇',
  },

  // Search Tools
  {
    id: 'fzf',
    name: 'fzf',
    description: 'Command-line fuzzy finder',
    category: 'search',
    packageManager: 'binary',
    packageName: 'fzf',
    command: 'fzf',
    icon: '🔍',
  },
  {
    id: 'ripgrep',
    name: 'Ripgrep',
    description: 'Recursively search directories for a regex pattern',
    category: 'search',
    packageManager: 'cargo',
    packageName: 'ripgrep',
    command: 'rg',
    icon: '🔎',
  },

  // Monitoring
  {
    id: 'btop',
    name: 'Btop',
    description: 'Resource monitor with beautiful interface',
    category: 'monitoring',
    packageManager: 'binary',
    packageName: 'btop',
    command: 'btop',
    icon: '📊',
  },

  // Shell Tools
  {
    id: 'zoxide',
    name: 'Zoxide',
    description: 'Smarter cd command that learns your habits',
    category: 'shell',
    packageManager: 'cargo',
    packageName: 'zoxide',
    command: 'zoxide',
    icon: '🚀',
  },
  {
    id: 'starship',
    name: 'Starship',
    description: 'Minimal, blazing-fast, customizable prompt',
    category: 'shell',
    packageManager: 'cargo',
    packageName: 'starship',
    command: 'starship',
    icon: '✨',
  },

  // Utility
  {
    id: 'tldr',
    name: 'TLDR',
    description: 'Simplified and community-driven man pages',
    category: 'utility',
    packageManager: 'npm',
    packageName: 'tldr',
    command: 'tldr',
    icon: '📖',
  },
  {
    id: 'jq',
    name: 'jq',
    description: 'Lightweight command-line JSON processor',
    category: 'utility',
    packageManager: 'binary',
    packageName: 'jq',
    command: 'jq',
    icon: '{}',
  },
  {
    id: 'httpie',
    name: 'HTTPie',
    description: 'User-friendly HTTP client for the API era',
    category: 'networking',
    packageManager: 'pip',
    packageName: 'httpie',
    command: 'http',
    icon: '🌐',
  },

  // Docker
  {
    id: 'lazydocker',
    name: 'Lazydocker',
    description: 'Simple terminal UI for Docker',
    category: 'docker',
    packageManager: 'binary',
    packageName: 'lazydocker',
    command: 'lazydocker',
    icon: '🐳',
  },

  // Editor
  {
    id: 'neovim',
    name: 'Neovim',
    description: 'Hyperextensible Vim-based text editor',
    category: 'editor',
    packageManager: 'binary',
    packageName: 'neovim',
    command: 'nvim',
    icon: '📝',
  },
];

// Category labels for display
export const categoryLabels: Record<PluginCategory, string> = {
  'ai-assistant': 'AI Assistants',
  'git': 'Git Tools',
  'files': 'File Management',
  'search': 'Search',
  'monitoring': 'Monitoring',
  'editor': 'Editors',
  'shell': 'Shell Tools',
  'utility': 'Utilities',
  'docker': 'Docker',
  'networking': 'Networking',
};
