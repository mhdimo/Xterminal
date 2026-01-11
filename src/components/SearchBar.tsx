// SearchBar - Terminal search UI (Ctrl+Shift+F)
// Overlay search bar for finding text in terminal

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronUp, ChevronDown, CaseSensitive, Regex } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchOptions {
  caseSensitive: boolean;
  regex: boolean;
}

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string, options: SearchOptions) => boolean;
  onSearchPrevious?: (query: string, options: SearchOptions) => boolean;
}

export function SearchBar({ 
  isOpen, 
  onClose, 
  onSearch,
  onSearchPrevious,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    regex: false,
  });
  const [hasResults, setHasResults] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHasResults(null);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Perform search
  const doSearch = useCallback((direction: 'next' | 'prev' = 'next') => {
    if (!query) {
      setHasResults(null);
      return;
    }
    const searchFn = direction === 'prev' && onSearchPrevious ? onSearchPrevious : onSearch;
    const found = searchFn(query, options);
    setHasResults(found);
  }, [query, options, onSearch, onSearchPrevious]);

  // Trigger search on query or options change
  useEffect(() => {
    if (isOpen && query) {
      doSearch('next');
    } else {
      setHasResults(null);
    }
  }, [query, options.caseSensitive, options.regex, isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        doSearch('prev');
      } else {
        doSearch('next');
      }
    } else if (e.key === 'F3') {
      e.preventDefault();
      if (e.shiftKey) {
        doSearch('prev');
      } else {
        doSearch('next');
      }
    }
  }, [onClose, doSearch]);

  const toggleOption = (key: keyof SearchOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-4 z-10 flex items-center gap-2 bg-[#252526] border border-[#3c3c3c] rounded-b-lg shadow-lg px-3 py-2">
      {/* Search icon */}
      <Search className="w-4 h-4 text-gray-500 shrink-0" />
      
      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find..."
        className={cn(
          "w-48 bg-[#3c3c3c] text-white text-sm px-2 py-1 rounded outline-none border transition-colors",
          hasResults === false ? "border-red-500" : "border-transparent focus:border-[#0078d4]",
          "placeholder:text-gray-500"
        )}
      />

      {/* Status indicator */}
      {query && hasResults !== null && (
        <span className={cn(
          "text-xs min-w-15",
          hasResults ? "text-gray-500" : "text-red-400"
        )}>
          {hasResults ? 'Found' : 'No results'}
        </span>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => doSearch('prev')}
          disabled={!query}
          className="p-1 hover:bg-[#3c3c3c] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={() => doSearch('next')}
          disabled={!query}
          className="p-1 hover:bg-[#3c3c3c] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Next match (Enter)"
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Option toggles */}
      <div className="flex items-center gap-0.5 border-l border-[#3c3c3c] pl-2 ml-1">
        <button
          onClick={() => toggleOption('caseSensitive')}
          className={cn(
            'p-1 rounded transition-colors',
            options.caseSensitive 
              ? 'bg-[#0078d4] text-white' 
              : 'hover:bg-[#3c3c3c] text-gray-400'
          )}
          title="Match Case"
        >
          <CaseSensitive className="w-4 h-4" />
        </button>
        <button
          onClick={() => toggleOption('regex')}
          className={cn(
            'p-1 rounded transition-colors',
            options.regex 
              ? 'bg-[#0078d4] text-white' 
              : 'hover:bg-[#3c3c3c] text-gray-400'
          )}
          title="Use Regular Expression"
        >
          <Regex className="w-4 h-4" />
        </button>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="p-1 hover:bg-[#3c3c3c] rounded transition-colors ml-1"
        title="Close (Esc)"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}
