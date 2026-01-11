// CommandPalette - Fuzzy search for commands (Ctrl+Shift+P)
// Windows Terminal-style command palette

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Terminal, Settings, Plus, Copy, Split, X, Keyboard, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Command {
  id: string;
  name: string;
  description?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  category: 'tab' | 'pane' | 'settings' | 'view' | 'terminal';
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

const categoryLabels: Record<Command['category'], string> = {
  tab: 'Tabs',
  pane: 'Panes',
  settings: 'Settings',
  view: 'View',
  terminal: 'Terminal',
};

const categoryIcons: Record<Command['category'], React.ReactNode> = {
  tab: <Terminal className="w-4 h-4" />,
  pane: <Split className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  view: <Palette className="w-4 h-4" />,
  terminal: <Keyboard className="w-4 h-4" />,
};

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    
    const lowerQuery = query.toLowerCase();
    return commands.filter(cmd => 
      cmd.name.toLowerCase().includes(lowerQuery) ||
      cmd.description?.toLowerCase().includes(lowerQuery) ||
      cmd.category.toLowerCase().includes(lowerQuery)
    ).sort((a, b) => {
      // Prioritize name matches
      const aNameMatch = a.name.toLowerCase().indexOf(lowerQuery);
      const bNameMatch = b.name.toLowerCase().indexOf(lowerQuery);
      if (aNameMatch !== -1 && bNameMatch === -1) return -1;
      if (bNameMatch !== -1 && aNameMatch === -1) return 1;
      if (aNameMatch !== bNameMatch) return aNameMatch - bNameMatch;
      return a.name.localeCompare(b.name);
    });
  }, [commands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    
    const selectedItem = list.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const executeCommand = useCallback((cmd: Command) => {
    onClose();
    // Small delay to let the palette close first
    setTimeout(() => cmd.action(), 50);
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredCommands, selectedIndex, executeCommand, onClose]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm">
      <div 
        className="w-[600px] max-w-[90vw] bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#3c3c3c]">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-white text-lg placeholder:text-gray-500 outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Command list */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-[#252526]">
                  {categoryLabels[category as Command['category']]}
                </div>
                {cmds.map((cmd) => {
                  const index = flatIndex++;
                  return (
                    <div
                      key={cmd.id}
                      data-index={index}
                      onClick={() => executeCommand(cmd)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                        index === selectedIndex 
                          ? 'bg-[#0078d4] text-white' 
                          : 'hover:bg-[#2d2d2d]'
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center w-8 h-8 rounded',
                        index === selectedIndex ? 'bg-white/20' : 'bg-[#3c3c3c]'
                      )}>
                        {cmd.icon || categoryIcons[cmd.category]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'text-sm font-medium truncate',
                          index === selectedIndex ? 'text-white' : 'text-gray-200'
                        )}>
                          {cmd.name}
                        </div>
                        {cmd.description && (
                          <div className={cn(
                            'text-xs truncate',
                            index === selectedIndex ? 'text-white/70' : 'text-gray-500'
                          )}>
                            {cmd.description}
                          </div>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <kbd className={cn(
                          'px-2 py-1 text-xs font-mono rounded',
                          index === selectedIndex 
                            ? 'bg-white/20 text-white' 
                            : 'bg-[#3c3c3c] text-gray-400'
                        )}>
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[#3c3c3c] bg-[#252526]">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span><kbd className="px-1 bg-[#3c3c3c] rounded">↑↓</kbd> navigate</span>
            <span><kbd className="px-1 bg-[#3c3c3c] rounded">Enter</kbd> select</span>
            <span><kbd className="px-1 bg-[#3c3c3c] rounded">Esc</kbd> close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
