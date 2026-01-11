// TabContextMenu - Right-click menu for tabs
// Provides tab actions like rename, duplicate, color, close

import { useState, useEffect, useRef } from 'react';
import { Copy, Palette, Edit2, X, SplitSquareHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  tabId: string;
  tabTitle: string;
  onClose: () => void;
  onRename: (tabId: string) => void;
  onDuplicate: (tabId: string) => void;
  onSetColor: (tabId: string, color: string | undefined) => void;
  onMoveToNewWindow?: (tabId: string) => void;
  onClose_Tab: (tabId: string) => void;
}

const TAB_COLORS = [
  { name: 'None', value: undefined },
  { name: 'Red', value: '#e74c3c' },
  { name: 'Orange', value: '#e67e22' },
  { name: 'Yellow', value: '#f1c40f' },
  { name: 'Green', value: '#2ecc71' },
  { name: 'Blue', value: '#3498db' },
  { name: 'Purple', value: '#9b59b6' },
  { name: 'Pink', value: '#e91e63' },
  { name: 'Teal', value: '#1abc9c' },
];

export function TabContextMenu({
  isOpen,
  x,
  y,
  tabId,
  tabTitle,
  onClose,
  onRename,
  onDuplicate,
  onSetColor,
  onMoveToNewWindow,
  onClose_Tab,
}: TabContextMenuProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Reset color picker when menu closes
  useEffect(() => {
    if (!isOpen) setShowColorPicker(false);
  }, [isOpen]);

  if (!isOpen) return null;

  // Adjust position to keep menu on screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl py-1 min-w-45"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {/* Tab title header */}
      <div className="px-3 py-2 border-b border-[#3c3c3c]">
        <div className="text-xs text-gray-500">Tab</div>
        <div className="text-sm text-white font-medium truncate">{tabTitle}</div>
      </div>

      {/* Menu items */}
      <div className="py-1">
        <button
          onClick={() => {
            onRename(tabId);
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#3c3c3c] transition-colors"
        >
          <Edit2 className="w-4 h-4 text-gray-400" />
          Rename Tab
        </button>

        <button
          onClick={() => {
            onDuplicate(tabId);
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#3c3c3c] transition-colors"
        >
          <Copy className="w-4 h-4 text-gray-400" />
          Duplicate Tab
        </button>

        {/* Color submenu */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#3c3c3c] transition-colors"
          >
            <Palette className="w-4 h-4 text-gray-400" />
            Tab Color
            <span className="ml-auto text-gray-500">▸</span>
          </button>

          {showColorPicker && (
            <div className="absolute left-full top-0 ml-1 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl py-2 min-w-35">
              {TAB_COLORS.map(({ name, value }) => (
                <button
                  key={name}
                  onClick={() => {
                    onSetColor(tabId, value);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-[#3c3c3c] transition-colors"
                >
                  {value ? (
                    <div 
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: value }}
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-gray-500 bg-transparent flex items-center justify-center">
                      <X className="w-3 h-3 text-gray-500" />
                    </div>
                  )}
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {onMoveToNewWindow && (
          <button
            onClick={() => {
              onMoveToNewWindow(tabId);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#3c3c3c] transition-colors"
          >
            <SplitSquareHorizontal className="w-4 h-4 text-gray-400" />
            Move to New Window
          </button>
        )}
      </div>

      {/* Close tab */}
      <div className="border-t border-[#3c3c3c] py-1">
        <button
          onClick={() => {
            onClose_Tab(tabId);
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-red-400 hover:bg-[#3c3c3c] transition-colors"
        >
          <X className="w-4 h-4" />
          Close Tab
        </button>
      </div>
    </div>
  );
}
