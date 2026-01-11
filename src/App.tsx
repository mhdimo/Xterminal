// Xterminal - Windows Terminal-inspired terminal emulator for Linux
// Main App component

import { useEffect, useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, type Window as TauriWindow, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window';
import { TitleBar } from './components/TitleBar';
import { PaneContainer } from './components/terminal/PaneContainer';
import { SettingsPanel } from './components/SettingsPanel';
import { CommandPalette, type Command } from './components/CommandPalette';
import { SearchBar } from './components/SearchBar';
import { useTabStore, usePaneStore, useSettingsStore } from './store';
import '../styles/globals.css';

// Window state interface
interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

export function App() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab, duplicateTab, clearBellOnActive, updateTabRootPaneId, getTabByRootPaneId } = useTabStore();
  const { createRootPane, splitPane, closePane, findLeafPaneId, broadcastMode, toggleBroadcastMode, activePaneId, setActivePaneId, getAllLeafPanes, getNode, nodes } = usePaneStore();
  const { loadSettings, settings, updateSettings } = useSettingsStore();
  // Use ref to prevent double-init in StrictMode
  const isInitializedRef = useRef(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [hostname, setHostname] = useState<string>('');
  const windowRef = useRef<TauriWindow | null>(null);
  
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

  // Save window state (debounced)
  const saveWindowStateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveWindowState = useCallback(async () => {
    const window = windowRef.current;
    if (!window) return;
    
    // Clear any pending save
    if (saveWindowStateRef.current) {
      clearTimeout(saveWindowStateRef.current);
    }
    
    // Debounce saves to avoid too many writes during resize
    saveWindowStateRef.current = setTimeout(async () => {
      try {
        const position = await window.outerPosition();
        const size = await window.outerSize();
        const isMaximized = await window.isMaximized();
        
        const state: WindowState = {
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height,
          isMaximized,
        };
        
        await invoke('save_window_state', { state });
      } catch (err) {
        console.error('Failed to save window state:', err);
      }
    }, 500);
  }, []);

  // Initialize settings and window state
  useEffect(() => {
    loadSettings();
    // Get hostname for tab titles
    invoke<string>('get_hostname').then(setHostname).catch(() => setHostname('Terminal'));
    
    // Load window state and apply it
    const initWindow = async () => {
      try {
        const window = getCurrentWindow();
        windowRef.current = window;
        
        const savedState = await invoke<WindowState | null>('load_window_state');
        if (savedState) {
          // Apply saved position and size
          if (!savedState.isMaximized) {
            await window.setPosition(new PhysicalPosition(savedState.x, savedState.y));
            await window.setSize(new PhysicalSize(savedState.width, savedState.height));
          }
          if (savedState.isMaximized) {
            await window.maximize();
          }
        }
        
        // Listen for window events to save state
        const unlistenMove = await window.onMoved(() => saveWindowState());
        const unlistenResize = await window.onResized(() => saveWindowState());
        const unlistenClose = await window.onCloseRequested(async () => {
          await saveWindowState();
          // Allow the window to close after saving
          await window.close();
        });
        
        return () => {
          unlistenMove();
          unlistenResize();
          unlistenClose();
        };
      } catch (err) {
        console.error('Failed to initialize window state:', err);
      }
    };
    
    initWindow();
  }, [loadSettings, saveWindowState]);

  // Create initial tab on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    if (!hostname) return; // Wait for hostname
    isInitializedRef.current = true;
    
    // Create tab which generates a rootPaneId, then create the pane
    const { rootPaneId } = addTab(undefined, undefined, hostname);
    createRootPane(rootPaneId);
    // Set the initial pane as active
    setActivePaneId(rootPaneId);
  }, [addTab, createRootPane, hostname, setActivePaneId]);

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
      setActivePaneId(rootPaneId);
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

    // Helper function to handle split pane and update tab's rootPaneId if needed
    const handleSplitPane = (direction: 'horizontal' | 'vertical') => {
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (!activeTab) {
        return;
      }
      
      const activeRootPaneId = activeTab.rootPaneId;
      
      // Use the focused pane if available, otherwise fall back to finding the first leaf
      const currentActivePaneId = usePaneStore.getState().activePaneId;
      const paneToSplit = currentActivePaneId || findLeafPaneId(activeRootPaneId);
      
      if (!paneToSplit) {
        return;
      }
      
      const result = splitPane(paneToSplit, direction);
      if (!result.containerId) {
        return;
      }
      
      // If the pane we split was the tab's root pane, update the tab's rootPaneId
      if (paneToSplit === activeRootPaneId) {
        updateTabRootPaneId(activeTab.id, result.containerId);
      }
      
      // Set the new pane as active
      setActivePaneId(result.newPaneId);
    };

    // Helper function to close the active pane
    const handleClosePane = () => {
      const currentActivePaneId = usePaneStore.getState().activePaneId;
      if (!currentActivePaneId) return;
      
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (!activeTab) return;
      
      // Get all leaf panes for this tab
      const allLeaves = getAllLeafPanes();
      const tabLeaves = allLeaves.filter(leaf => {
        // Check if this leaf belongs to current tab by traversing up
        let nodeId: string | null = leaf.id;
        while (nodeId) {
          if (nodeId === activeTab.rootPaneId) return true;
          // Find parent
          let parentId: string | null = null;
          for (const [id, node] of usePaneStore.getState().nodes) {
            if (node.type === 'branch' && (node.first === nodeId || node.second === nodeId)) {
              parentId = id;
              break;
            }
          }
          nodeId = parentId;
        }
        return false;
      });
      
      // Don't close if it's the only pane in the tab
      if (tabLeaves.length <= 1) {
        // Close the tab instead
        closeTab(activeTab.id);
        return;
      }
      
      // Close the PTY session first
      const node = getNode(currentActivePaneId);
      if (node?.type === 'leaf' && node.sessionId) {
        invoke('pty_close', { sessionId: node.sessionId }).catch(() => {});
      }
      
      // Close the pane
      closePane(currentActivePaneId);
      
      // Update tab rootPaneId if needed (closePane handles this internally)
      const newRootId = usePaneStore.getState().rootId;
      if (newRootId && newRootId !== activeTab.rootPaneId) {
        updateTabRootPaneId(activeTab.id, newRootId);
      }
    };

    // Helper function to navigate between panes
    const navigatePane = (direction: 'up' | 'down' | 'left' | 'right') => {
      const currentActivePaneId = usePaneStore.getState().activePaneId;
      if (!currentActivePaneId) return;
      
      const allLeaves = getAllLeafPanes();
      if (allLeaves.length <= 1) return;
      
      // Simple navigation: cycle through panes
      const currentIndex = allLeaves.findIndex(p => p.id === currentActivePaneId);
      if (currentIndex < 0) return;
      
      let nextIndex: number;
      if (direction === 'left' || direction === 'up') {
        nextIndex = (currentIndex - 1 + allLeaves.length) % allLeaves.length;
      } else {
        nextIndex = (currentIndex + 1) % allLeaves.length;
      }
      
      const nextPane = allLeaves[nextIndex];
      if (nextPane) {
        setActivePaneId(nextPane.id);
      }
    };

    // Alt+Shift+W - Close active pane
    // Alt+Shift+D - Split pane (auto direction)
    // Alt+Shift+- - Split horizontal
    // Alt+Shift++ - Split vertical
    // Alt+Shift+B - Toggle broadcast input
    if (isAlt && isShift) {
      if (e.key === 'W' || e.key === 'w') {
        e.preventDefault();
        e.stopPropagation();
        handleClosePane();
      }
      if (e.key === 'D' || e.key === 'd') {
        e.preventDefault();
        e.stopPropagation();
        handleSplitPane('vertical');
      }
      if (e.key === '-' || e.key === '_' || e.code === 'Minus') {
        e.preventDefault();
        e.stopPropagation();
        handleSplitPane('horizontal');
      }
      if (e.key === '=' || e.key === '+' || e.code === 'Equal') {
        e.preventDefault();
        e.stopPropagation();
        handleSplitPane('vertical');
      }
      if (e.key === 'B' || e.key === 'b') {
        e.preventDefault();
        toggleBroadcastMode();
      }
    }

    // Alt+Arrow keys - Navigate between panes
    if (isAlt && !isShift && !isCtrl) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigatePane('up');
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigatePane('down');
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePane('left');
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigatePane('right');
      }
    }

    // Ctrl+Tab / Ctrl+Shift+Tab - Switch tabs
    if (isCtrl && e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const currentIndex = tabs.findIndex(t => t.id === activeTabId);
      if (tabs.length > 1 && currentIndex >= 0) {
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
    if (isCtrl && isShift && (e.key === 'P' || e.key === 'p')) {
      e.preventDefault();
      e.stopPropagation();
      setIsCommandPaletteOpen(true);
    }

    // Ctrl+Shift+F - Open Search in Terminal
    if (isCtrl && isShift && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault();
      e.stopPropagation();
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
  }, [addTab, createRootPane, closeTab, activeTabId, splitPane, tabs, setActiveTab, isSettingsOpen, isCommandPaletteOpen, isSearchOpen, findLeafPaneId, settings.fontSize, updateSettings, toggleBroadcastMode, hostname, updateTabRootPaneId]);

  // Helper for command palette split actions
  const handleCommandSplit = (direction: 'horizontal' | 'vertical') => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;
    const leafId = findLeafPaneId(activeTab.rootPaneId);
    if (!leafId) return;
    const result = splitPane(leafId, direction);
    if (result.containerId && leafId === activeTab.rootPaneId) {
      updateTabRootPaneId(activeTab.id, result.containerId);
    }
  };

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
    { id: 'split-horizontal', name: 'Split Pane Horizontally', category: 'pane', shortcut: 'Alt+Shift+-', action: () => handleCommandSplit('horizontal') },
    { id: 'split-vertical', name: 'Split Pane Vertically', category: 'pane', shortcut: 'Alt+Shift++', action: () => handleCommandSplit('vertical') },
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
