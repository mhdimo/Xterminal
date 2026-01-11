// Tab Store Tests
import { describe, test, expect, beforeEach } from 'bun:test';
import { useTabStore } from '../tabStore';

describe('tabStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useTabStore.setState({
      tabs: [],
      activeTabId: null,
    });
  });

  describe('addTab', () => {
    test('creates a new tab with generated IDs', () => {
      const { addTab } = useTabStore.getState();
      const { tabId, rootPaneId } = addTab();
      
      const state = useTabStore.getState();
      expect(state.tabs.length).toBe(1);
      expect(state.tabs[0]?.id).toBe(tabId);
      expect(state.tabs[0]?.rootPaneId).toBe(rootPaneId);
      expect(state.activeTabId).toBe(tabId);
    });

    test('creates a tab with provided root pane ID', () => {
      const { addTab } = useTabStore.getState();
      const { rootPaneId } = addTab('existing-pane');
      
      expect(rootPaneId).toBe('existing-pane');
      const state = useTabStore.getState();
      expect(state.tabs[0]?.rootPaneId).toBe('existing-pane');
    });

    test('creates a tab with custom title', () => {
      const { addTab } = useTabStore.getState();
      addTab(undefined, undefined, 'My Terminal');
      
      const state = useTabStore.getState();
      expect(state.tabs[0]?.title).toBe('My Terminal');
    });

    test('deactivates previous tabs when adding new one', () => {
      const { addTab } = useTabStore.getState();
      addTab();
      const { tabId: secondTabId } = addTab();
      
      const state = useTabStore.getState();
      expect(state.tabs[0]?.isActive).toBe(false);
      expect(state.tabs[1]?.isActive).toBe(true);
      expect(state.activeTabId).toBe(secondTabId);
    });
  });

  describe('closeTab', () => {
    test('closes a tab', () => {
      const { addTab, closeTab } = useTabStore.getState();
      const { tabId } = addTab();
      
      closeTab(tabId);
      
      const state = useTabStore.getState();
      expect(state.tabs.length).toBe(0);
      expect(state.activeTabId).toBeNull();
    });

    test('activates previous tab when closing active tab', () => {
      const { addTab, closeTab } = useTabStore.getState();
      const { tabId: firstTabId } = addTab();
      const { tabId: secondTabId } = addTab();
      
      closeTab(secondTabId);
      
      const state = useTabStore.getState();
      expect(state.tabs.length).toBe(1);
      expect(state.activeTabId).toBe(firstTabId);
    });

    test('activates next tab when closing first active tab', () => {
      const { addTab, closeTab, setActiveTab } = useTabStore.getState();
      const { tabId: firstTabId } = addTab();
      const { tabId: secondTabId } = addTab();
      
      setActiveTab(firstTabId);
      closeTab(firstTabId);
      
      const state = useTabStore.getState();
      expect(state.tabs.length).toBe(1);
      expect(state.activeTabId).toBe(secondTabId);
    });
  });

  describe('setActiveTab', () => {
    test('sets the active tab', () => {
      const { addTab, setActiveTab } = useTabStore.getState();
      const { tabId: firstTabId } = addTab();
      addTab();
      
      setActiveTab(firstTabId);
      
      const state = useTabStore.getState();
      expect(state.activeTabId).toBe(firstTabId);
      expect(state.tabs.find(t => t.id === firstTabId)?.isActive).toBe(true);
    });
  });

  describe('updateTabTitle', () => {
    test('updates tab title', () => {
      const { addTab, updateTabTitle } = useTabStore.getState();
      const { tabId } = addTab();
      
      updateTabTitle(tabId, 'New Title');
      
      const state = useTabStore.getState();
      expect(state.tabs[0]?.title).toBe('New Title');
    });
  });

  describe('moveTab', () => {
    test('moves tab from one index to another', () => {
      const { addTab, moveTab } = useTabStore.getState();
      addTab(undefined, undefined, 'Tab 1');
      addTab(undefined, undefined, 'Tab 2');
      addTab(undefined, undefined, 'Tab 3');
      
      moveTab(0, 2);
      
      const state = useTabStore.getState();
      expect(state.tabs[0]?.title).toBe('Tab 2');
      expect(state.tabs[1]?.title).toBe('Tab 3');
      expect(state.tabs[2]?.title).toBe('Tab 1');
    });
  });

  describe('duplicateTab', () => {
    test('duplicates a tab', () => {
      const { addTab, duplicateTab, setTabColor } = useTabStore.getState();
      const { tabId } = addTab(undefined, 'profile-1', 'Original');
      setTabColor(tabId, '#ff0000');
      
      const result = duplicateTab(tabId);
      
      expect(result).not.toBeNull();
      const state = useTabStore.getState();
      expect(state.tabs.length).toBe(2);
      
      // New tab should inherit properties
      const newTab = state.tabs.find(t => t.id === result?.tabId);
      expect(newTab?.title).toBe('Original');
      expect(newTab?.color).toBe('#ff0000');
      expect(newTab?.profileId).toBe('profile-1');
    });
  });

  describe('getActiveTab', () => {
    test('returns the active tab', () => {
      const { addTab, getActiveTab } = useTabStore.getState();
      const { tabId } = addTab();
      
      const activeTab = useTabStore.getState().getActiveTab();
      expect(activeTab?.id).toBe(tabId);
    });

    test('returns null when no tabs', () => {
      const activeTab = useTabStore.getState().getActiveTab();
      expect(activeTab).toBeNull();
    });
  });

  describe('setTabBell / clearBellOnActive', () => {
    test('sets bell indicator', () => {
      const { addTab, setTabBell } = useTabStore.getState();
      const { tabId } = addTab();
      
      setTabBell(tabId, true);
      
      const state = useTabStore.getState();
      expect(state.tabs[0]?.hasBell).toBe(true);
    });

    test('clears bell on active tab', () => {
      const { addTab, setTabBell, clearBellOnActive } = useTabStore.getState();
      const { tabId } = addTab();
      setTabBell(tabId, true);
      
      clearBellOnActive();
      
      const state = useTabStore.getState();
      expect(state.tabs[0]?.hasBell).toBe(false);
    });
  });
});
