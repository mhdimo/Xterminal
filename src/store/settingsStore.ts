// Settings Store - Settings state management
// Manages application settings including profiles, color schemes, and keybindings

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Settings, Profile, ColorScheme, KeyBinding, TerminalSettings, MouseAction } from '@/types';
import { defaultSettings } from '@/types/settings';

interface SettingsState {
  settings: Settings;
  isLoading: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => void;
  updateTerminalSettings: (updates: Partial<TerminalSettings>) => void;
  addProfile: (profile: Profile) => void;
  updateProfile: (id: string, updates: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;
  addColorScheme: (scheme: ColorScheme) => void;
  updateColorScheme: (id: string, updates: Partial<ColorScheme>) => void;
  deleteColorScheme: (id: string) => void;
  setActiveProfile: (id: string) => void;
  setActiveColorScheme: (id: string) => void;
  getActiveProfile: () => Profile | undefined;
  getActiveColorScheme: () => ColorScheme | undefined;
  
  // Keybinding management
  updateKeyBinding: (id: string, updates: Partial<KeyBinding>) => void;
  addKeyToBinding: (id: string, key: string) => void;
  removeKeyFromBinding: (id: string, key: string) => void;
  addMouseActionToBinding: (id: string, action: MouseAction) => void;
  removeMouseActionFromBinding: (id: string, action: MouseAction) => void;
  getBindingForCommand: (command: string) => KeyBinding | undefined;
  getBindingsForKey: (key: string) => KeyBinding[];
  resetKeyBindings: () => void;
}

// Debounce save to avoid excessive disk writes
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSave = (settings: Settings) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      await invoke('save_settings', { settings });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, 500);
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const savedSettings = await invoke<Settings | null>('load_settings');
      if (savedSettings) {
        // Merge with defaults to handle new settings added in updates
        const mergedSettings = { ...defaultSettings, ...savedSettings };
        set({ settings: mergedSettings, isLoading: false });
      } else {
        set({ settings: defaultSettings, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ settings: defaultSettings, isLoading: false });
    }
  },

  saveSettings: async () => {
    const { settings } = get();
    try {
      await invoke('save_settings', { settings });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  updateSettings: (updates) => {
    set((state) => {
      const newSettings = { ...state.settings, ...updates };
      debouncedSave(newSettings);
      return { settings: newSettings };
    });
  },

  addProfile: (profile) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        profiles: [...state.settings.profiles, profile],
      };
      debouncedSave(newSettings);
      return { settings: newSettings };
    });
  },

  updateProfile: (id, updates) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        profiles: state.settings.profiles.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      };
      debouncedSave(newSettings);
      return { settings: newSettings };
    });
  },

  deleteProfile: (id) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        profiles: state.settings.profiles.filter((p) => p.id !== id),
      };
      debouncedSave(newSettings);
      return { settings: newSettings };
    });
  },

  addColorScheme: (scheme) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        colorSchemes: [...state.settings.colorSchemes, scheme],
      };
      debouncedSave(newSettings);
      return { settings: newSettings };
    });
  },

  updateColorScheme: (id, updates) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        colorSchemes: state.settings.colorSchemes.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      };
      debouncedSave(newSettings);
      return { settings: newSettings };
    });
  },

  deleteColorScheme: (id) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        colorSchemes: state.settings.colorSchemes.filter((s) => s.id !== id),
      };
      debouncedSave(newSettings);
      return { settings: newSettings };
    });
  },

  setActiveProfile: (id) => {
    const newSettings = { ...get().settings, activeProfileId: id };
    debouncedSave(newSettings);
    set({ settings: newSettings });
  },

  setActiveColorScheme: (id) => {
    const newSettings = { ...get().settings, activeColorSchemeId: id };
    debouncedSave(newSettings);
    set({ settings: newSettings });
  },

  getActiveProfile: () => {
    const { settings } = get();
    return settings.profiles.find((p) => p.id === settings.activeProfileId);
  },

  getActiveColorScheme: () => {
    const { settings } = get();
    return settings.colorSchemes.find((s) => s.id === settings.activeColorSchemeId);
  },

  // Terminal settings
  updateTerminalSettings: (updates) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        terminal: { ...state.settings.terminal, ...updates },
      };
      debouncedSave(newSettings);
      return { settings: newSettings };
    });
  },

  // Keybinding management
  updateKeyBinding: (id, updates) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        keyBindings: state.settings.keyBindings.map((kb) =>
          kb.id === id ? { ...kb, ...updates } : kb
        ),
      };
      debouncedSave(newSettings);
      return { settings: newSettings };
    });
  },

  addKeyToBinding: (id, key) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        keyBindings: state.settings.keyBindings.map((kb) =>
          kb.id === id && !kb.keys.includes(key)
            ? { ...kb, keys: [...kb.keys, key] }
            : kb
        ),
      };
      debouncedSave(newSettings);
      return { settings: newSettings };
    });
  },

  removeKeyFromBinding: (id, key) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        keyBindings: state.settings.keyBindings.map((kb) =>
          kb.id === id
            ? { ...kb, keys: kb.keys.filter((k) => k !== key) }
            : kb
        ),
      };
      debouncedSave(newSettings);
      return { settings: newSettings };
    });
  },

  addMouseActionToBinding: (id, action) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        keyBindings: state.settings.keyBindings.map((kb) => {
          if (kb.id !== id) return kb;
          const mouseActions = kb.mouseActions || [];
          if (mouseActions.includes(action)) return kb;
          return { ...kb, mouseActions: [...mouseActions, action] };
        }),
      };
      debouncedSave(newSettings);
      return { settings: newSettings };
    });
  },

  removeMouseActionFromBinding: (id, action) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        keyBindings: state.settings.keyBindings.map((kb) =>
          kb.id === id
            ? { ...kb, mouseActions: (kb.mouseActions || []).filter((a) => a !== action) }
            : kb
        ),
      };
      debouncedSave(newSettings);
      return { settings: newSettings };
    });
  },

  getBindingForCommand: (command) => {
    return get().settings.keyBindings.find((kb) => kb.command === command);
  },

  getBindingsForKey: (key) => {
    const normalizedKey = key.toLowerCase();
    return get().settings.keyBindings.filter((kb) =>
      kb.keys.some((k) => k.toLowerCase() === normalizedKey)
    );
  },

  resetKeyBindings: () => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        keyBindings: defaultSettings.keyBindings,
      };
      debouncedSave(newSettings);
      return { settings: newSettings };
    });
  },
}));
