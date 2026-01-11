// Windows Terminal-style TitleBar Component
// Combines tabs in titlebar with window controls - exact Windows Terminal styling

import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, X, ChevronDown, Terminal } from 'lucide-react';
import { useTabStore, usePaneStore, useSettingsStore } from '@/store';
import { TabContextMenu } from './TabContextMenu';
import { cn } from '@/lib/utils';

// Lazy import Tauri API to handle both browser and Tauri environments
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

interface TitleBarProps {
  onSettingsClick?: () => void;
}

export function TitleBar({ onSettingsClick }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [appWindow, setAppWindow] = useState<Awaited<ReturnType<typeof import('@tauri-apps/api/window').getCurrentWindow>> | null>(null);
  const [closingTabId, setClosingTabId] = useState<string | null>(null);
  const [newTabIds, setNewTabIds] = useState<Set<string>>(new Set());
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const [hostname, setHostname] = useState<string>('Terminal');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  
  // Tab store
  const { tabs, activeTabId, setActiveTab, closeTab, addTab, updateTabTitle, moveTab, duplicateTab, setTabColor } = useTabStore();
  const { createRootPane } = usePaneStore();
  const { settings, setActiveProfile } = useSettingsStore();
  
  const editInputRef = useRef<HTMLInputElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isProfileDropdownOpen]);

  // Fetch hostname for new tab titles
  useEffect(() => {
    invoke<string>('get_hostname').then(setHostname).catch(() => {});
  }, []);
  
  // Track previous tabs to detect new ones
  const prevTabsRef = useRef<string[]>([]);
  
  useEffect(() => {
    const currentIds = tabs.map(t => t.id);
    const prevIds = prevTabsRef.current;
    
    // Find new tabs
    const addedIds = currentIds.filter(id => !prevIds.includes(id));
    if (addedIds.length > 0) {
      setNewTabIds(prev => new Set([...prev, ...addedIds]));
      // Remove animation class after animation completes
      setTimeout(() => {
        setNewTabIds(prev => {
          const next = new Set(prev);
          addedIds.forEach(id => next.delete(id));
          return next;
        });
      }, 200);
    }
    
    prevTabsRef.current = currentIds;
  }, [tabs]);

  // Focus edit input when editing
  useEffect(() => {
    if (editingTabId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTabId]);

  const handleCloseTab = (tabId: string) => {
    setClosingTabId(tabId);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      closeTab(tabId);
      setClosingTabId(null);
    }, 150);
  };

  useEffect(() => {
    if (!isTauri()) return;

    const initTauri = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        setAppWindow(win);
        
        const maximized = await win.isMaximized();
        setIsMaximized(maximized);

        const unlisten = await win.onResized(async () => {
          try {
            const max = await win.isMaximized();
            setIsMaximized(max);
          } catch (e) {}
        });

        return () => { unlisten(); };
      } catch (e) {
        console.warn('Failed to initialize Tauri window:', e);
      }
    };

    initTauri();
  }, []);

  const handleMinimize = async () => {
    try { await appWindow?.minimize(); } catch (e) {}
  };

  const handleMaximize = async () => {
    try {
      if (isMaximized) {
        await appWindow?.unmaximize();
      } else {
        await appWindow?.maximize();
      }
      setIsMaximized(!isMaximized);
    } catch (e) {}
  };

  const handleClose = async () => {
    try { await appWindow?.close(); } catch (e) {}
  };

  const handleDragStart = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    try { await appWindow?.startDragging(); } catch (e) {}
  };

  const handleNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Create tab first, which generates a rootPaneId
    const { rootPaneId } = addTab(undefined, undefined, hostname);
    // Then create the pane with that ID
    createRootPane(rootPaneId);
  };

  const handleNewTabWithProfile = (profileId: string) => {
    // Set the active profile for spawning
    setActiveProfile(profileId);
    // Get the profile name for the tab title
    const profile = settings.profiles.find(p => p.id === profileId);
    const title = profile?.name || hostname;
    // Create tab with the profile
    const { rootPaneId } = addTab(undefined, profileId, title);
    createRootPane(rootPaneId);
    setIsProfileDropdownOpen(false);
  };

  const handleDoubleClick = async () => {
    await handleMaximize();
  };

  // Tab renaming
  const startEditing = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setEditingTabId(tabId);
      setEditTitle(tab.title);
    }
  };

  const finishEditing = () => {
    if (editingTabId && editTitle.trim()) {
      updateTabTitle(editingTabId, editTitle.trim());
    }
    setEditingTabId(null);
    setEditTitle('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
      setEditTitle('');
    }
  };

  // Tab drag & drop
  const handleTabDragStart = (e: React.DragEvent, tabId: string, index: number) => {
    e.stopPropagation();
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
  };

  const handleTabDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTabId) {
      setDragOverIndex(index);
    }
  };

  const handleTabDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTabId) {
      const sourceIndex = tabs.findIndex(t => t.id === draggedTabId);
      if (sourceIndex !== -1 && sourceIndex !== targetIndex) {
        moveTab(sourceIndex, targetIndex);
      }
    }
    setDraggedTabId(null);
    setDragOverIndex(null);
  };

  const handleTabDragEnd = () => {
    setDraggedTabId(null);
    setDragOverIndex(null);
  };

  // Context menu
  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  const handleDuplicateTab = (tabId: string) => {
    const result = duplicateTab(tabId);
    if (result) {
      createRootPane(result.rootPaneId);
    }
  };

  return (
    <div 
      className="flex items-center h-[36px] bg-[#202020] select-none rounded-t-lg"
      onDoubleClick={handleDoubleClick}
    >
      {/* Tabs area */}
      <div 
        className="flex items-end flex-1 h-full overflow-hidden"
        onMouseDown={handleDragStart}
      >
        {/* Tab strip */}
        <div className="flex items-end h-full pl-1 gap-0.5">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              draggable={editingTabId !== tab.id}
              onDragStart={(e) => handleTabDragStart(e, tab.id, index)}
              onDragOver={(e) => handleTabDragOver(e, index)}
              onDrop={(e) => handleTabDrop(e, index)}
              onDragEnd={handleTabDragEnd}
              onClick={(e) => {
                e.stopPropagation();
                if (closingTabId !== tab.id && editingTabId !== tab.id) {
                  setActiveTab(tab.id);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                startEditing(tab.id);
              }}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              className={cn(
                'group flex items-center gap-2 px-3 h-[30px] min-w-[100px] max-w-[180px] cursor-pointer relative',
                'rounded-t-md',
                tab.id === activeTabId 
                  ? 'bg-[#0c0c0c]' 
                  : 'bg-[#252525] hover:bg-[#2d2d2d]',
                // Animation classes
                closingTabId === tab.id && 'tab-exit',
                newTabIds.has(tab.id) && 'tab-enter',
                !closingTabId && !newTabIds.has(tab.id) && 'transition-colors duration-150',
                // Drag indicator
                dragOverIndex === index && draggedTabId !== tab.id && 'ring-2 ring-[#0078d4] ring-inset',
                draggedTabId === tab.id && 'opacity-50'
              )}
              style={tab.color ? { borderTop: `2px solid ${tab.color}` } : undefined}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Bell indicator */}
              {tab.hasBell && tab.id !== activeTabId && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-[#0078d4] rounded-full animate-pulse" />
              )}
              
              {/* Tab title or edit input */}
              {editingTabId === tab.id ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={finishEditing}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-[#3c3c3c] text-white text-[12px] px-1 py-0.5 rounded outline-none border border-[#0078d4]"
                />
              ) : (
                <span className={cn(
                  "flex-1 truncate text-[12px]",
                  tab.id === activeTabId ? "text-white font-medium" : "text-[#909090]"
                )}>
                  {tab.title}
                </span>
              )}
              
              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(tab.id);
                }}
                className={cn(
                  'flex items-center justify-center w-4 h-4 rounded-sm',
                  'hover:bg-[#505050] transition-all duration-150',
                  tab.id === activeTabId ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover:opacity-70 hover:!opacity-100'
                )}
              >
                <X className="w-3 h-3 text-[#909090] hover:text-white" />
              </button>
            </div>
          ))}
          
          {/* New tab button with profile dropdown */}
          <div ref={profileDropdownRef} className="relative flex items-center ml-0.5">
            <button
              onClick={handleNewTab}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-6 h-7 hover:bg-[#353535] rounded-l transition-colors"
              title="New Tab (Ctrl+T)"
            >
              <Plus className="w-4 h-4 text-[#808080] hover:text-white transition-colors" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsProfileDropdownOpen(!isProfileDropdownOpen);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-4 h-7 hover:bg-[#353535] rounded-r transition-colors border-l border-[#454545]"
              title="Select Profile"
            >
              <ChevronDown className={cn(
                "w-3 h-3 text-[#808080] hover:text-white transition-transform",
                isProfileDropdownOpen && "rotate-180"
              )} />
            </button>
            
            {/* Profile dropdown */}
            {isProfileDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="py-1">
                  <div className="px-3 py-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Profiles
                  </div>
                  {settings.profiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNewTabWithProfile(profile.id);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#3c3c3c] text-gray-200 transition-colors"
                    >
                      <Terminal className="w-4 h-4 text-[#808080]" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{profile.name}</div>
                        <div className="text-[10px] text-gray-500 truncate">{profile.shell}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Draggable spacer */}
        <div className="flex-1 h-full" />
      </div>

      {/* Right side buttons */}
      <div className="flex items-center h-full">
        {/* Menu dropdown button */}
        <button
          onClick={onSettingsClick}
          className="flex items-center justify-center h-full w-[46px] hover:bg-[#383838] transition-colors"
          title="Menu (Ctrl+,)"
        >
          <ChevronDown className="w-3 h-3 text-[#808080]" />
        </button>

        {/* Window controls */}
        {isTauri() && (
          <>
            {/* Minimize */}
            <button
              onClick={handleMinimize}
              className="flex items-center justify-center h-full w-[46px] hover:bg-[#383838] transition-colors"
              title="Minimize"
            >
              <svg className="w-[10px] h-[10px]" viewBox="0 0 10 10" fill="none">
                <line x1="0" y1="5" x2="10" y2="5" stroke="#cccccc" strokeWidth="1" />
              </svg>
            </button>

            {/* Maximize/Restore */}
            <button
              onClick={handleMaximize}
              className="flex items-center justify-center h-full w-[46px] hover:bg-[#383838] transition-colors"
              title={isMaximized ? 'Restore Down' : 'Maximize'}
            >
              {isMaximized ? (
                <svg className="w-[10px] h-[10px]" viewBox="0 0 10 10" fill="none">
                  <rect x="2" y="0" width="7" height="7" stroke="#cccccc" strokeWidth="1" fill="none" />
                  <rect x="0" y="2" width="7" height="7" stroke="#cccccc" strokeWidth="1" fill="#202020" />
                </svg>
              ) : (
                <svg className="w-[10px] h-[10px]" viewBox="0 0 10 10" fill="none">
                  <rect x="0" y="0" width="10" height="10" stroke="#cccccc" strokeWidth="1" />
                </svg>
              )}
            </button>

            {/* Close */}
            <button
              onClick={handleClose}
              className="flex items-center justify-center h-full w-[46px] hover:bg-[#c42b1c] transition-colors group"
              title="Close"
            >
              <svg className="w-[10px] h-[10px]" viewBox="0 0 10 10" fill="none">
                <line x1="0" y1="0" x2="10" y2="10" stroke="#cccccc" strokeWidth="1" />
                <line x1="10" y1="0" x2="0" y2="10" stroke="#cccccc" strokeWidth="1" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Tab Context Menu */}
      {contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tabId={contextMenu.tabId}
          onClose={() => setContextMenu(null)}
          onRename={() => {
            startEditing(contextMenu.tabId);
            setContextMenu(null);
          }}
          onDuplicate={() => {
            handleDuplicateTab(contextMenu.tabId);
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
}
