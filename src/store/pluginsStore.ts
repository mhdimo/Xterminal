// Plugins Store - Manages installed plugins and installation state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Plugin, InstalledPlugin, PackageManager } from '../types/plugins';
import { pluginsCatalog } from '../types/plugins';

interface PluginsState {
  installedPlugins: InstalledPlugin[];
  installingPlugins: Set<string>;
  
  // Actions
  isInstalled: (pluginId: string) => boolean;
  isInstalling: (pluginId: string) => boolean;
  markInstalling: (pluginId: string) => void;
  markInstalled: (plugin: Plugin, version: string) => void;
  markUninstalled: (pluginId: string) => void;
  markNotInstalling: (pluginId: string) => void;
  getInstallCommand: (plugin: Plugin) => string;
  getUninstallCommand: (plugin: Plugin) => string;
  getPlugin: (pluginId: string) => Plugin | undefined;
}

// Generate install command based on package manager
function getInstallCommand(plugin: Plugin): string {
  const pm = plugin.packageManager;
  const pkg = plugin.packageName;
  
  switch (pm) {
    case 'npm':
      return `bun install -g ${pkg}`;
    case 'pip':
      return `pip install ${pkg}`;
    case 'cargo':
      return `cargo install ${pkg}`;
    case 'go':
      return `go install ${pkg}@latest`;
    case 'apt':
      return `sudo apt install -y ${pkg}`;
    case 'brew':
      return `brew install ${pkg}`;
    case 'binary':
      // For binaries, provide helpful instructions
      return `# Install ${plugin.name} from: ${plugin.website || 'package manager'}\n# Or use your system package manager`;
    default:
      return `# Unknown package manager: ${pm}`;
  }
}

function getUninstallCommand(plugin: Plugin): string {
  const pm = plugin.packageManager;
  const pkg = plugin.packageName;
  
  switch (pm) {
    case 'npm':
      return `bun remove -g ${pkg}`;
    case 'pip':
      return `pip uninstall -y ${pkg}`;
    case 'cargo':
      return `cargo uninstall ${pkg}`;
    case 'apt':
      return `sudo apt remove -y ${pkg}`;
    case 'brew':
      return `brew uninstall ${pkg}`;
    default:
      return `# Manual uninstall required for ${plugin.name}`;
  }
}

export const usePluginsStore = create<PluginsState>()(
  persist(
    (set, get) => ({
      installedPlugins: [],
      installingPlugins: new Set(),

      isInstalled: (pluginId) => {
        return get().installedPlugins.some(p => p.id === pluginId);
      },

      isInstalling: (pluginId) => {
        return get().installingPlugins.has(pluginId);
      },

      markInstalling: (pluginId) => {
        set((state) => {
          const newSet = new Set(state.installingPlugins);
          newSet.add(pluginId);
          return { installingPlugins: newSet };
        });
      },

      markNotInstalling: (pluginId) => {
        set((state) => {
          const newSet = new Set(state.installingPlugins);
          newSet.delete(pluginId);
          return { installingPlugins: newSet };
        });
      },

      markInstalled: (plugin, version) => {
        set((state) => {
          // Check if already installed
          if (state.installedPlugins.some(p => p.id === plugin.id)) {
            return state;
          }
          
          const installed: InstalledPlugin = {
            ...plugin,
            installedAt: new Date().toISOString(),
            installedVersion: version,
          };
          
          const newSet = new Set(state.installingPlugins);
          newSet.delete(plugin.id);
          
          return {
            installedPlugins: [...state.installedPlugins, installed],
            installingPlugins: newSet,
          };
        });
      },

      markUninstalled: (pluginId) => {
        set((state) => ({
          installedPlugins: state.installedPlugins.filter(p => p.id !== pluginId),
        }));
      },

      getInstallCommand: (plugin) => getInstallCommand(plugin),
      
      getUninstallCommand: (plugin) => getUninstallCommand(plugin),

      getPlugin: (pluginId) => {
        return pluginsCatalog.find(p => p.id === pluginId);
      },
    }),
    {
      name: 'xterminal-plugins',
      partialize: (state) => ({
        installedPlugins: state.installedPlugins,
      }),
    }
  )
);
