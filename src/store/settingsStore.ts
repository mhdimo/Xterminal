// Settings Store - Settings state management
// Manages application settings including profiles, color schemes, and keybindings

import { create } from 'zustand';
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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      // For now, use default settings
      // TODO: Implement loading from Tauri API
      set({ settings: defaultSettings, isLoading: false });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ settings: defaultSettings, isLoading: false });
    }
  },

  saveSettings: async () => {
    const { settings } = get();
    try {
      // TODO: Implement saving via Tauri API
      console.log('Saving settings:', settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  updateSettings: (updates) => {
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
  },

  addProfile: (profile) => {
    set((state) => ({
      settings: {
        ...state.settings,
        profiles: [...state.settings.profiles, profile],
      },
    }));
  },

  updateProfile: (id, updates) => {
    set((state) => ({
      settings: {
        ...state.settings,
        profiles: state.settings.profiles.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      },
    }));
  },

  deleteProfile: (id) => {
    set((state) => ({
      settings: {
        ...state.settings,
        profiles: state.settings.profiles.filter((p) => p.id !== id),
      },
    }));
  },

  addColorScheme: (scheme) => {
    set((state) => ({
      settings: {
        ...state.settings,
        colorSchemes: [...state.settings.colorSchemes, scheme],
      },
    }));
  },

  updateColorScheme: (id, updates) => {
    set((state) => ({
      settings: {
        ...state.settings,
        colorSchemes: state.settings.colorSchemes.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      },
    }));
  },

  deleteColorScheme: (id) => {
    set((state) => ({
      settings: {
        ...state.settings,
        colorSchemes: state.settings.colorSchemes.filter((s) => s.id !== id),
      },
    }));
  },

  setActiveProfile: (id) => {
    set({ settings: { ...get().settings, activeProfileId: id } });
  },

  setActiveColorScheme: (id) => {
    set({ settings: { ...get().settings, activeColorSchemeId: id } });
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
    set((state) => ({
      settings: {
        ...state.settings,
        terminal: { ...state.settings.terminal, ...updates },
      },
    }));
  },

  // Keybinding management
  updateKeyBinding: (id, updates) => {
    set((state) => ({
      settings: {
        ...state.settings,
        keyBindings: state.settings.keyBindings.map((kb) =>
          kb.id === id ? { ...kb, ...updates } : kb
        ),
      },
    }));
  },

  addKeyToBinding: (id, key) => {
    set((state) => ({
      settings: {
        ...state.settings,
        keyBindings: state.settings.keyBindings.map((kb) =>
          kb.id === id && !kb.keys.includes(key)
            ? { ...kb, keys: [...kb.keys, key] }
            : kb
        ),
      },
    }));
  },

  removeKeyFromBinding: (id, key) => {
    set((state) => ({
      settings: {
        ...state.settings,
        keyBindings: state.settings.keyBindings.map((kb) =>
          kb.id === id
            ? { ...kb, keys: kb.keys.filter((k) => k !== key) }
            : kb
        ),
      },
    }));
  },

  addMouseActionToBinding: (id, action) => {
    set((state) => ({
      settings: {
        ...state.settings,
        keyBindings: state.settings.keyBindings.map((kb) => {
          if (kb.id !== id) return kb;
          const mouseActions = kb.mouseActions || [];
          if (mouseActions.includes(action)) return kb;
          return { ...kb, mouseActions: [...mouseActions, action] };
        }),
      },
    }));
  },

  removeMouseActionFromBinding: (id, action) => {
    set((state) => ({
      settings: {
        ...state.settings,
        keyBindings: state.settings.keyBindings.map((kb) =>
          kb.id === id
            ? { ...kb, mouseActions: (kb.mouseActions || []).filter((a) => a !== action) }
            : kb
        ),
      },
    }));
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
    set((state) => ({
      settings: {
        ...state.settings,
        keyBindings: defaultSettings.keyBindings,
      },
    }));
  },
}));
