// Xterminal - Windows Terminal-inspired terminal emulator for Linux
// Main App component

import { useEffect, useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TitleBar } from './components/TitleBar';
import { PaneContainer } from './components/terminal/PaneContainer';
import { SettingsPanel } from './components/SettingsPanel';
import { CommandPalette, type Command } from './components/CommandPalette';
import { SearchBar } from './components/SearchBar';
import { useTabStore, usePaneStore, useSettingsStore } from './store';
import '../styles/globals.css';

export function App() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab, duplicateTab, clearBellOnActive } = useTabStore();
  const { createRootPane, splitPane, findLeafPaneId, broadcastMode, toggleBroadcastMode } = usePaneStore();
  const { loadSettings, settings, updateSettings } = useSettingsStore();
  // Use ref to prevent double-init in StrictMode
  const isInitializedRef = useRef(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [hostname, setHostname] = useState<string>('');
  
  // Search API ref (set by active terminal)
  const searchApiRef = useRef<{
    findNext: (term: string, options?: { caseSensitive?: boolean; regex?: boolean }) => boolean;
    findPrevious: (term: string, options?: { caseSensitive?: boolean; regex?: boolean }) => boolean;
    clearSearch: () => void;
  } | null>(null);

  // Clear bell indicator when switching to a tab
  useEffect(() => {
    if (activeTabId) {
      clearBellOnActive();
    }
  }, [activeTabId, clearBellOnActive]);

  // Initialize settings
  useEffect(() => {
    loadSettings();
    // Get hostname for tab titles
    invoke<string>('get_hostname').then(setHostname).catch(() => setHostname('Terminal'));
  }, [loadSettings]);

  // Create initial tab on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    if (!hostname) return; // Wait for hostname
    isInitializedRef.current = true;
    
    // Create tab which generates a rootPaneId, then create the pane
    const { rootPaneId } = addTab(undefined, undefined, hostname);
    createRootPane(rootPaneId);
  }, [addTab, createRootPane, hostname]);

  // Keyboard shortcuts - Windows Terminal inspired
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isCtrl = e.ctrlKey;
    const isShift = e.shiftKey;
    const isAlt = e.altKey;

    // Ctrl+T - New Tab
    if (isCtrl && !isShift && !isAlt && e.key === 't') {
      e.preventDefault();
      const { rootPaneId } = addTab(undefined, undefined, hostname || 'Terminal');
      createRootPane(rootPaneId);
    }

    // Ctrl+W - Close Tab
    if (isCtrl && !isShift && !isAlt && e.key === 'w') {
      e.preventDefault();
      // Get activeTabId directly from store to ensure we have the latest value
      const currentActiveTabId = useTabStore.getState().activeTabId;
      if (currentActiveTabId) {
        closeTab(currentActiveTabId);
      }
    }

    // Zoom: Ctrl++ / Ctrl+= to zoom in, Ctrl+- to zoom out, Ctrl+0 to reset
    if (isCtrl && !isShift && !isAlt) {
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        const currentSize = settings.fontSize || 14;
        updateSettings({ fontSize: Math.min(currentSize + 1, 32) });
      }
      if (e.key === '-') {
        e.preventDefault();
        const currentSize = settings.fontSize || 14;
        updateSettings({ fontSize: Math.max(currentSize - 1, 8) });
      }
      if (e.key === '0') {
        e.preventDefault();
        updateSettings({ fontSize: 14 });
      }
    }

    // Alt+Shift+D - Split pane (auto direction)
    // Alt+Shift+- - Split horizontal
    // Alt+Shift++ - Split vertical
    // Alt+Shift+B - Toggle broadcast input
    if (isAlt && isShift) {
      const activeTab = tabs.find(t => t.id === activeTabId);
      const activeRootPaneId = activeTab?.rootPaneId;
      
      if (e.key === 'D' || e.key === 'd') {
        e.preventDefault();
        if (activeRootPaneId) {
          const leafId = findLeafPaneId(activeRootPaneId);
          if (leafId) splitPane(leafId, 'vertical');
        }
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        if (activeRootPaneId) {
          const leafId = findLeafPaneId(activeRootPaneId);
          if (leafId) splitPane(leafId, 'horizontal');
        }
      }
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        if (activeRootPaneId) {
          const leafId = findLeafPaneId(activeRootPaneId);
          if (leafId) splitPane(leafId, 'vertical');
        }
      }
      if (e.key === 'B' || e.key === 'b') {
        e.preventDefault();
        toggleBroadcastMode();
      }
    }

    // Ctrl+Tab / Ctrl+Shift+Tab - Switch tabs
    if (isCtrl && e.key === 'Tab') {
      e.preventDefault();
      const currentIndex = tabs.findIndex(t => t.id === activeTabId);
      if (tabs.length > 1) {
        const nextIndex = isShift
          ? (currentIndex - 1 + tabs.length) % tabs.length
          : (currentIndex + 1) % tabs.length;
        const nextTab = tabs[nextIndex];
        if (nextTab) {
          setActiveTab(nextTab.id);
        }
      }
    }

    // Ctrl+, - Open settings
    if (isCtrl && e.key === ',') {
      e.preventDefault();
      setIsSettingsOpen(true);
    }

    // Ctrl+Shift+P - Open Command Palette
    if (isCtrl && isShift && e.key === 'P') {
      e.preventDefault();
      setIsCommandPaletteOpen(true);
    }

    // Ctrl+Shift+F - Open Search in Terminal
    if (isCtrl && isShift && e.key === 'F') {
      e.preventDefault();
      setIsSearchOpen(true);
    }

    // Escape - Close settings or plugins
    if (e.key === 'Escape') {
      if (isCommandPaletteOpen) {
        e.preventDefault();
        setIsCommandPaletteOpen(false);
      } else if (isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(false);
        searchApiRef.current?.clearSearch();
      } else if (isSettingsOpen) {
        e.preventDefault();
        setIsSettingsOpen(false);
      }
    }

    // Ctrl+1-9 - Switch to tab by number
    if (isCtrl && !isShift && !isAlt) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        e.preventDefault();
        const tabIndex = num - 1;
        if (tabs[tabIndex]) {
          setActiveTab(tabs[tabIndex].id);
        }
      }
    }
  }, [addTab, createRootPane, closeTab, activeTabId, splitPane, tabs, setActiveTab, isSettingsOpen, isCommandPaletteOpen, isSearchOpen, findLeafPaneId, settings.fontSize, updateSettings, toggleBroadcastMode, hostname]);

  // Command Palette commands
  const commands: Command[] = [
    // Tab commands
    { id: 'new-tab', name: 'New Tab', category: 'tab', shortcut: 'Ctrl+T', action: () => { const { rootPaneId } = addTab(undefined, undefined, hostname || 'Terminal'); createRootPane(rootPaneId); } },
    { id: 'close-tab', name: 'Close Tab', category: 'tab', shortcut: 'Ctrl+W', action: () => activeTabId && closeTab(activeTabId) },
    { id: 'duplicate-tab', name: 'Duplicate Tab', category: 'tab', action: () => activeTabId && duplicateTab(activeTabId) },
    { id: 'next-tab', name: 'Next Tab', category: 'tab', shortcut: 'Ctrl+Tab', action: () => {
      const idx = tabs.findIndex(t => t.id === activeTabId);
      const nextTab = tabs[(idx + 1) % tabs.length];
      if (idx >= 0 && tabs.length > 1 && nextTab) setActiveTab(nextTab.id);
    }},
    { id: 'prev-tab', name: 'Previous Tab', category: 'tab', shortcut: 'Ctrl+Shift+Tab', action: () => {
      const idx = tabs.findIndex(t => t.id === activeTabId);
      const prevTab = tabs[(idx - 1 + tabs.length) % tabs.length];
      if (idx >= 0 && tabs.length > 1 && prevTab) setActiveTab(prevTab.id);
    }},
    
    // Pane commands
    { id: 'split-horizontal', name: 'Split Pane Horizontally', category: 'pane', shortcut: 'Alt+Shift+-', action: () => {
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab) { const leafId = findLeafPaneId(activeTab.rootPaneId); if (leafId) splitPane(leafId, 'horizontal'); }
    }},
    { id: 'split-vertical', name: 'Split Pane Vertically', category: 'pane', shortcut: 'Alt+Shift++', action: () => {
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab) { const leafId = findLeafPaneId(activeTab.rootPaneId); if (leafId) splitPane(leafId, 'vertical'); }
    }},
    { id: 'broadcast-toggle', name: `${broadcastMode ? 'Disable' : 'Enable'} Broadcast Input`, category: 'pane', shortcut: 'Alt+Shift+B', description: 'Send input to all panes', action: () => toggleBroadcastMode() },
    { id: 'move-pane-to-tab', name: 'Move Pane to New Tab', category: 'pane', description: 'Open current pane in a new tab', action: () => {
      // Create a new tab - for single pane, this effectively moves it
      const { rootPaneId } = addTab(undefined, undefined, hostname || 'Terminal');
      createRootPane(rootPaneId);
    }},
    
    // View commands
    { id: 'zoom-in', name: 'Zoom In', category: 'view', shortcut: 'Ctrl++', action: () => updateSettings({ fontSize: Math.min((settings.fontSize || 14) + 1, 32) }) },
    { id: 'zoom-out', name: 'Zoom Out', category: 'view', shortcut: 'Ctrl+-', action: () => updateSettings({ fontSize: Math.max((settings.fontSize || 14) - 1, 8) }) },
    { id: 'zoom-reset', name: 'Reset Zoom', category: 'view', shortcut: 'Ctrl+0', action: () => updateSettings({ fontSize: 14 }) },
    
    // Terminal commands
    { id: 'search', name: 'Find in Terminal', category: 'terminal', shortcut: 'Ctrl+Shift+F', action: () => setIsSearchOpen(true) },
    
    // Settings & Panels
    { id: 'settings', name: 'Open Settings', category: 'settings', shortcut: 'Ctrl+,', action: () => setIsSettingsOpen(true) },
    { id: 'command-palette', name: 'Command Palette', category: 'settings', shortcut: 'Ctrl+Shift+P', action: () => {} },
  ];

  useEffect(() => {
    // Use capture phase to intercept before terminal gets the key
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);
  return (
    <div className="h-screen flex flex-col bg-[#0c0c0c] text-[#cccccc] overflow-hidden rounded-lg border border-[#3c3c3c]">
      {/* Custom Title Bar with integrated tabs */}
      <TitleBar onSettingsClick={() => setIsSettingsOpen(true)} />

      {/* Terminal Container - takes up remaining space */}
      <div className="flex-1 overflow-hidden bg-[#0c0c0c] relative">
        {/* Broadcast mode indicator */}
        {broadcastMode && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-[#0078d4] text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Broadcast Mode Active
            <button 
              onClick={toggleBroadcastMode}
              className="ml-1 hover:bg-white/20 rounded p-0.5"
              title="Turn off (Alt+Shift+B)"
            >
              ✕
            </button>
          </div>
        )}
        
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              'h-full w-full',
              tab.id !== activeTabId && 'hidden'
            )}
          >
            <PaneContainer nodeId={tab.rootPaneId} />
          </div>
        ))}

        {/* Empty state */}
        {tabs.length === 0 && (
          <div className="h-full flex items-center justify-center text-[#808080]">
            <div className="text-center">
              <p className="text-lg mb-2">No terminals open</p>
              <button
                onClick={() => {
                  const { rootPaneId } = addTab(undefined, undefined, hostname || 'Terminal');
                  createRootPane(rootPaneId);
                }}
                className="text-[#0078d4] hover:underline"
              >
                Press Ctrl+Shift+T to open a new terminal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />

      {/* Search Bar */}
      <SearchBar
        isOpen={isSearchOpen}
        onClose={() => {
          setIsSearchOpen(false);
          searchApiRef.current?.clearSearch();
        }}
        onSearch={(term, options) => {
          return searchApiRef.current?.findNext(term, options) || false;
        }}
        onSearchPrevious={(term, options) => {
          return searchApiRef.current?.findPrevious(term, options) || false;
        }}
      />
    </div>
  );
}

export default App;

// Utility function for className
function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
