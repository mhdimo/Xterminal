// TerminalPane Component - Individual terminal pane
// Wraps the Terminal component for use in the pane tree

import { usePaneStore } from '@/store';
import { Terminal } from './Terminal';

interface TerminalPaneProps {
  paneId: string;
}

export function TerminalPane({ paneId }: TerminalPaneProps) {
  // Subscribe to the nodes map to re-render when session ID changes
  const nodes = usePaneStore((state) => state.nodes);
  const node = nodes.get(paneId);
  const sessionId = node?.type === 'leaf' ? node.sessionId : null;

  return <Terminal paneId={paneId} sessionId={sessionId} />;
}
