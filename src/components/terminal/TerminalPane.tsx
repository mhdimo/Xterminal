// TerminalPane Component - Individual terminal pane
// Wraps the Terminal component for use in the pane tree

import { usePaneStore, useTabStore } from '@/store';
import { Terminal } from './Terminal';
import { TerminalErrorBoundary } from '../ErrorBoundary';
import { useCallback, useState } from 'react';

interface TerminalPaneProps {
  paneId: string;
}

export function TerminalPane({ paneId }: TerminalPaneProps) {
  // Subscribe to the nodes map to re-render when session ID changes
  const nodes = usePaneStore((state) => state.nodes);
  const activePaneId = usePaneStore((state) => state.activePaneId);
  const setActivePaneId = usePaneStore((state) => state.setActivePaneId);
  const getAllLeafPanes = usePaneStore((state) => state.getAllLeafPanes);
  const node = nodes.get(paneId);
  const sessionId = node?.type === 'leaf' ? node.sessionId : null;
  const isActive = activePaneId === paneId;
  
  // Get pane index for accessibility label
  const allLeaves = getAllLeafPanes();
  const paneIndex = allLeaves.findIndex(p => p.id === paneId) + 1;
  const totalPanes = allLeaves.length;
  
  // Key to force remount on restart
  const [restartKey, setRestartKey] = useState(0);

  const handleFocus = useCallback(() => {
    setActivePaneId(paneId);
  }, [paneId, setActivePaneId]);

  const handleRestart = useCallback(() => {
    setRestartKey(k => k + 1);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Allow focusing with Enter/Space when tabbing through
    if (e.key === 'Enter' || e.key === ' ') {
      handleFocus();
    }
  }, [handleFocus]);

  return (
    <div 
      className={`h-full w-full relative ${
        isActive ? 'ring-1 ring-[#0078d4] ring-inset' : ''
      }`}
      onClick={handleFocus}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label={`Terminal pane ${paneIndex} of ${totalPanes}${isActive ? ', active' : ''}`}
      tabIndex={0}
    >
      <TerminalErrorBoundary paneId={paneId} onRestart={handleRestart}>
        <Terminal key={restartKey} paneId={paneId} sessionId={sessionId} />
      </TerminalErrorBoundary>
    </div>
  );
}
