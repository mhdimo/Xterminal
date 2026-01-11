// Pane Store - Pane and split state management
// Manages the binary tree structure for terminal panes and splits

import { create } from 'zustand';
import type { Pane, SplitContainer, PaneNode, SplitType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface PaneState {
  nodes: Map<string, PaneNode>;
  rootId: string | null;
  broadcastMode: boolean;
  activePaneId: string | null;

  // Actions
  createRootPane: (paneId?: string) => string;
  splitPane: (paneId: string, direction: SplitType) => { newPaneId: string; containerId: string };
  closePane: (paneId: string) => void;
  resizePane: (nodeId: string, size: number) => void;
  setSessionId: (paneId: string, sessionId: string) => void;
  getSessionId: (paneId: string) => string | null;
  findLeafPaneId: (nodeId: string) => string | null;
  getNode: (nodeId: string) => PaneNode | undefined;
  getAllLeafPanes: () => Pane[];
  toggleBroadcastMode: () => void;
  setActivePaneId: (paneId: string | null) => void;
}

export const usePaneStore = create<PaneState>((set, get) => ({
  nodes: new Map(),
  rootId: null,
  broadcastMode: false,
  activePaneId: null,

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
      console.error('[paneStore] Cannot split non-leaf node:', paneId);
      return { newPaneId: '', containerId: '' };
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

      // Find and update parent node if any
      let foundParent = false;
      for (const [key, node] of state.nodes) {
        if (node.type === 'branch') {
          if (node.first === paneId) {
            nodes.set(key, { ...node, first: containerId });
            foundParent = true;
            break;
          }
          if (node.second === paneId) {
            nodes.set(key, { ...node, second: containerId });
            foundParent = true;
            break;
          }
        }
      }

      // If no parent was found, this pane was a root - update global rootId if it matches
      if (!foundParent && state.rootId === paneId) {
        return { nodes, rootId: containerId };
      }

      return { nodes };
    });

    // Return both IDs so caller can update tab's rootPaneId if needed
    return { newPaneId, containerId };
  },

  closePane: (paneId) => {
    const state = get();
    const nodeToClose = state.nodes.get(paneId);
    
    if (!nodeToClose || nodeToClose.type !== 'leaf') {
      console.error('[paneStore.closePane] Cannot close non-leaf node:', paneId);
      return;
    }
    
    // Find the parent container of this pane
    let parentId: string | null = null;
    let siblingId: string | null = null;
    let isFirst = false;
    
    for (const [id, node] of state.nodes) {
      if (node.type === 'branch') {
        if (node.first === paneId) {
          parentId = id;
          siblingId = node.second;
          isFirst = true;
          break;
        }
        if (node.second === paneId) {
          parentId = id;
          siblingId = node.first;
          isFirst = false;
          break;
        }
      }
    }
    
    set((innerState) => {
      const nodes = new Map(innerState.nodes);
      
      // Remove the pane
      nodes.delete(paneId);
      
      // If there's no parent, this was the only pane (root) - just remove it
      if (!parentId || !siblingId) {
        return { nodes, rootId: null, activePaneId: null };
      }
      
      // Get the sibling node
      const siblingNode = nodes.get(siblingId);
      if (!siblingNode) {
        return { nodes };
      }
      
      // Find grandparent (parent of the parent container)
      let grandparentId: string | null = null;
      let parentIsFirst = false;
      
      for (const [id, node] of innerState.nodes) {
        if (node.type === 'branch') {
          if (node.first === parentId) {
            grandparentId = id;
            parentIsFirst = true;
            break;
          }
          if (node.second === parentId) {
            grandparentId = id;
            parentIsFirst = false;
            break;
          }
        }
      }
      
      // Remove the parent container
      nodes.delete(parentId);
      
      // Update references
      if (grandparentId) {
        // Update grandparent to point to sibling
        const grandparent = nodes.get(grandparentId);
        if (grandparent && grandparent.type === 'branch') {
          if (parentIsFirst) {
            nodes.set(grandparentId, { ...grandparent, first: siblingId });
          } else {
            nodes.set(grandparentId, { ...grandparent, second: siblingId });
          }
        }
      }
      
      // Update rootId if parent was the root
      const newRootId = innerState.rootId === parentId ? siblingId : innerState.rootId;
      
      // Set sibling as active if we're closing the active pane
      const newActivePaneId = innerState.activePaneId === paneId 
        ? (siblingNode.type === 'leaf' ? siblingId : get().findLeafPaneId(siblingId))
        : innerState.activePaneId;
      
      return { nodes, rootId: newRootId, activePaneId: newActivePaneId };
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

  setActivePaneId: (paneId) => {
    set({ activePaneId: paneId });
  },
}));
