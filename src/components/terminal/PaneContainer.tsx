// PaneContainer Component - Recursive pane tree renderer
// Renders the binary tree structure of panes and splits
// Styled to match Windows Terminal's split panes

import { usePaneStore } from '@/store';
import { TerminalPane } from './TerminalPane';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';

interface PaneContainerProps {
  nodeId: string;
}

export function PaneContainer({ nodeId }: PaneContainerProps) {
  const { nodes, resizePane } = usePaneStore();
  const node = nodes.get(nodeId);

  if (!node) return null;

  // Leaf node - render terminal
  if (node.type === 'leaf') {
    return <TerminalPane paneId={node.id} />;
  }

  // Branch node - render split container with resizable panels
  if (node.type === 'branch') {
    const isHorizontal = node.splitType === 'horizontal';
    const direction = isHorizontal ? 'vertical' : 'horizontal';

    return (
      <PanelGroup
        direction={direction}
        className="h-full w-full"
        onLayout={(sizes) => {
          // Update size when user drags the handle
          if (sizes[0] !== undefined) {
            resizePane(node.id, sizes[0]);
          }
        }}
      >
        <Panel
          defaultSize={node.size ?? 50}
          minSize={10}
          className="h-full"
        >
          <PaneContainer nodeId={node.first} />
        </Panel>
        
        {/* Windows Terminal-style resize handle - subtle line */}
        <PanelResizeHandle className={`
          ${isHorizontal ? 'h-[4px] cursor-row-resize' : 'w-[4px] cursor-col-resize'}
          bg-transparent hover:bg-[#0078d4] active:bg-[#0078d4] transition-colors
          flex items-center justify-center group
        `}>
          <div className={`
            ${isHorizontal ? 'w-full h-[1px]' : 'w-[1px] h-full'}
            bg-[#3d3d3d] group-hover:bg-[#0078d4] group-active:bg-[#0078d4] transition-colors
          `} />
        </PanelResizeHandle>
        
        <Panel
          defaultSize={100 - (node.size ?? 50)}
          minSize={10}
          className="h-full"
        >
          <PaneContainer nodeId={node.second} />
        </Panel>
      </PanelGroup>
    );
  }

  return null;
}
