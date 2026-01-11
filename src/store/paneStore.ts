// Pane Store - Pane and split state management
// Manages the binary tree structure for terminal panes and splits

import { create } from 'zustand';
import type { Pane, SplitContainer, PaneNode, SplitType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface PaneState {
  nodes: Map<string, PaneNode>;
  rootId: string | null;
  broadcastMode: boolean;

  // Actions
  createRootPane: (paneId?: string) => string;
  splitPane: (paneId: string, direction: SplitType) => string;
  closePane: (paneId: string) => void;
  resizePane: (nodeId: string, size: number) => void;
  setSessionId: (paneId: string, sessionId: string) => void;
  getSessionId: (paneId: string) => string | null;
  findLeafPaneId: (nodeId: string) => string | null;
  getNode: (nodeId: string) => PaneNode | undefined;
  getAllLeafPanes: () => Pane[];
  toggleBroadcastMode: () => void;
}

export const usePaneStore = create<PaneState>((set, get) => ({
  nodes: new Map(),
  rootId: null,
  broadcastMode: false,

  createRootPane: (existingId) => {
    const id = existingId || uuidv4();
    const pane: Pane = {
      id,
      type: 'leaf',
      sessionId: null,
    };

    set((state) => {
      const nodes = new Map(state.nodes);
      nodes.set(id, pane);
      return { nodes, rootId: id };
    });

    return id;
  },

  splitPane: (paneId, direction) => {
    const state = get();
    const existingPane = state.nodes.get(paneId);

    if (!existingPane || existingPane.type !== 'leaf') {
      throw new Error('Cannot split non-leaf node');
    }

    const newPaneId = uuidv4();
    const containerId = uuidv4();

    const container: SplitContainer = {
      id: containerId,
      type: 'branch',
      splitType: direction,
      first: paneId,
      second: newPaneId,
      size: 50, // Default 50/50 split
    };

    const newPane: Pane = {
      id: newPaneId,
      type: 'leaf',
      sessionId: null,
    };

    set((state) => {
      const nodes = new Map(state.nodes);
      nodes.set(containerId, container);
      nodes.set(newPaneId, newPane);

      // Update parent reference if this wasn't the root
      if (state.rootId !== paneId) {
        // Find and update parent node
        for (const [key, node] of state.nodes) {
          if (node.type === 'branch') {
            if (node.first === paneId) {
              nodes.set(key, { ...node, first: containerId });
              break;
            }
            if (node.second === paneId) {
              nodes.set(key, { ...node, second: containerId });
              break;
            }
          }
        }
      } else {
        // This was the root, update root reference
        return { nodes, rootId: containerId };
      }

      return { nodes };
    });

    return newPaneId;
  },

  closePane: (paneId) => {
    // For the first milestone, we'll only handle single-pane scenarios
    // Full implementation would handle tree rebalancing
    set((state) => {
      const nodes = new Map(state.nodes);
      nodes.delete(paneId);
      return { nodes };
    });
  },

  resizePane: (nodeId, size) => {
    set((state) => {
      const nodes = new Map(state.nodes);
      const node = nodes.get(nodeId);
      if (node && node.type === 'branch') {
        nodes.set(nodeId, { ...node, size });
      }
      return { nodes };
    });
  },

  setSessionId: (paneId, sessionId) => {
    set((state) => {
      const nodes = new Map(state.nodes);
      const node = nodes.get(paneId);
      if (node && node.type === 'leaf') {
        nodes.set(paneId, { ...node, sessionId });
      }
      return { nodes };
    });
  },

  getSessionId: (paneId) => {
    const node = get().nodes.get(paneId);
    if (node && node.type === 'leaf') {
      return node.sessionId;
    }
    return null;
  },

  findLeafPaneId: (nodeId) => {
    const node = get().nodes.get(nodeId);
    if (!node) return null;
    if (node.type === 'leaf') return node.id;
    if (node.type === 'branch') {
      // Recursively search first child
      return get().findLeafPaneId(node.first);
    }
    return null;
  },

  getNode: (nodeId) => {
    return get().nodes.get(nodeId);
  },

  getAllLeafPanes: () => {
    const nodes = get().nodes;
    const leaves: Pane[] = [];
    nodes.forEach((node) => {
      if (node.type === 'leaf') {
        leaves.push(node as Pane);
      }
    });
    return leaves;
  },

  toggleBroadcastMode: () => {
    set((state) => ({ broadcastMode: !state.broadcastMode }));
  },
}));
