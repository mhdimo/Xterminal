// Tab Store - Tab state management
// Manages terminal tabs

import { create } from 'zustand';
import type { Tab } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;

  // Actions
  addTab: (rootPaneId?: string, profileId?: string, initialTitle?: string) => { tabId: string; rootPaneId: string };
  duplicateTab: (tabId: string) => { tabId: string; rootPaneId: string } | null;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  updateTabTitleByPane: (paneId: string, title: string) => void;
  setTabColor: (tabId: string, color: string | undefined) => void;
  setTabBell: (tabId: string, hasBell: boolean) => void;
  clearBellOnActive: () => void;
  moveTab: (fromIndex: number, toIndex: number) => void;
  getActiveTab: () => Tab | null;
  getTabByPaneId: (paneId: string) => Tab | null;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (existingPaneId, profileId, initialTitle) => {
    const id = uuidv4();
    const rootPaneId = existingPaneId || uuidv4();
    const newTab: Tab = {
      id,
      title: initialTitle || 'Terminal',
      isActive: true,
      rootPaneId,
      profileId,
    };

    set((state) => {
      // Deactivate all tabs
      const tabs = state.tabs.map((t) => ({ ...t, isActive: false }));
      return {
        tabs: [...tabs, newTab],
        activeTabId: id,
      };
    });

    return { tabId: id, rootPaneId };
  },

  duplicateTab: (tabId) => {
    const state = get();
    const sourceTab = state.tabs.find(t => t.id === tabId);
    if (!sourceTab) return null;
    
    const id = uuidv4();
    const rootPaneId = uuidv4();
    const newTab: Tab = {
      id,
      title: sourceTab.title,
      isActive: true,
      rootPaneId,
      profileId: sourceTab.profileId,
      color: sourceTab.color,
    };

    set((state) => {
      const tabs = state.tabs.map((t) => ({ ...t, isActive: false }));
      // Insert after the source tab
      const sourceIndex = tabs.findIndex(t => t.id === tabId);
      tabs.splice(sourceIndex + 1, 0, newTab);
      return {
        tabs,
        activeTabId: id,
      };
    });

    return { tabId: id, rootPaneId };
  },

  closeTab: (tabId) => {
    set((state) => {
      const tabIndex = state.tabs.findIndex((t) => t.id === tabId);
      const newTabs = state.tabs.filter((t) => t.id !== tabId);
      
      // If closing the active tab, switch to the previous tab (or next if first)
      let newActiveId = state.activeTabId;
      if (state.activeTabId === tabId && newTabs.length > 0) {
        // Prefer previous tab, fall back to same index (which is now the next tab)
        const newIndex = Math.min(tabIndex - 1, newTabs.length - 1);
        newActiveId = newTabs[Math.max(0, newIndex)]?.id ?? null;
      } else if (newTabs.length === 0) {
        newActiveId = null;
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveId,
      };
    });
  },

  setActiveTab: (tabId) => {
    set((state) => ({
      tabs: state.tabs.map((t) => ({
        ...t,
        isActive: t.id === tabId,
      })),
      activeTabId: tabId,
    }));
  },

  updateTabTitle: (tabId, title) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, title } : t)),
    }));
  },

  updateTabTitleByPane: (paneId, title) => {
    set((state) => {
      // Find the tab whose rootPaneId matches the paneId
      const tab = state.tabs.find((t) => t.rootPaneId === paneId);
      if (!tab) return state;
      return {
        tabs: state.tabs.map((t) => (t.id === tab.id ? { ...t, title } : t)),
      };
    });
  },

  moveTab: (fromIndex, toIndex) => {
    set((state) => {
      const tabs = [...state.tabs];
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, moved);
      return { tabs };
    });
  },

  setTabColor: (tabId, color) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, color } : t)),
    }));
  },

  setTabBell: (tabId, hasBell) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, hasBell } : t)),
    }));
  },

  clearBellOnActive: () => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === activeTabId ? { ...t, hasBell: false } : t)),
    }));
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) || null;
  },

  getTabByPaneId: (paneId) => {
    const { tabs } = get();
    return tabs.find((t) => t.rootPaneId === paneId) || null;
  },
}));
