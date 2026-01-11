// TabBar Component - Tab bar with close buttons
// Displays tabs and allows switching/closing them

import { useTabStore, usePaneStore } from '@/store';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, addTab } = useTabStore();
  const { createRootPane } = usePaneStore();

  const handleNewTab = () => {
    const tabId = addTab();
    // Create root pane for new tab
    createRootPane();
  };

  return (
    <div className="flex items-center bg-muted border-b">
      <div className="flex items-center overflow-x-auto flex-1">
        {tabs.length === 0 ? (
          <button
            onClick={handleNewTab}
            className="px-4 py-2 text-sm text-muted-foreground hover:bg-background/50"
          >
            + New Terminal
          </button>
        ) : (
          tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 cursor-pointer border-r min-w-[120px] max-w-[200px]',
                'hover:bg-background/50 transition-colors',
                tab.isActive && 'bg-background border-b-2 border-b-primary'
              )}
            >
              {tab.icon && <span className="text-sm">{tab.icon}</span>}
              <span className="flex-1 truncate text-sm">{tab.title}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="mr-2"
        onClick={handleNewTab}
        title="New Tab (Ctrl+Shift+T)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      </Button>
    </div>
  );
}
