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
    <div 
      className="flex items-center bg-muted border-b"
      role="tablist"
      aria-label="Terminal tabs"
    >
      <div className="flex items-center overflow-x-auto flex-1">
        {tabs.length === 0 ? (
          <button
            onClick={handleNewTab}
            className="px-4 py-2 text-sm text-muted-foreground hover:bg-background/50"
            aria-label="Create new terminal tab"
          >
            + New Terminal
          </button>
        ) : (
          tabs.map((tab, index) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab(tab.id);
                }
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 cursor-pointer border-r min-w-30 max-w-50',
                'hover:bg-background/50 transition-colors',
                tab.isActive && 'bg-background border-b-2 border-b-primary'
              )}
              role="tab"
              tabIndex={0}
              aria-selected={tab.isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              aria-label={`${tab.title}${tab.hasBell ? ', has notification' : ''}`}
            >
              {tab.icon && <span className="text-sm" aria-hidden="true">{tab.icon}</span>}
              <span className="flex-1 truncate text-sm">{tab.title}</span>
              {tab.hasBell && (
                <span className="sr-only">Notification</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                aria-label={`Close tab: ${tab.title}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
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
        aria-label="New Tab (Ctrl+Shift+T)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      </Button>
    </div>
  );
}
