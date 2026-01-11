// Pane Store Tests
import { describe, test, expect, beforeEach } from 'bun:test';
import { usePaneStore } from '../paneStore';

describe('paneStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    const store = usePaneStore.getState();
    usePaneStore.setState({
      nodes: new Map(),
      rootId: null,
      broadcastMode: false,
      activePaneId: null,
    });
  });

  describe('createRootPane', () => {
    test('creates a root pane with generated ID', () => {
      const { createRootPane, nodes, rootId } = usePaneStore.getState();
      const id = createRootPane();
      
      const state = usePaneStore.getState();
      expect(state.rootId).toBe(id);
      expect(state.nodes.has(id)).toBe(true);
      
      const node = state.nodes.get(id);
      expect(node?.type).toBe('leaf');
    });

    test('creates a root pane with provided ID', () => {
      const { createRootPane } = usePaneStore.getState();
      const customId = 'custom-pane-id';
      const id = createRootPane(customId);
      
      const state = usePaneStore.getState();
      expect(id).toBe(customId);
      expect(state.rootId).toBe(customId);
      expect(state.nodes.has(customId)).toBe(true);
    });
  });

  describe('splitPane', () => {
    test('splits a pane vertically', () => {
      const { createRootPane, splitPane } = usePaneStore.getState();
      const rootId = createRootPane();
      
      const result = splitPane(rootId, 'vertical');
      
      expect(result.newPaneId).toBeTruthy();
      expect(result.containerId).toBeTruthy();
      
      const state = usePaneStore.getState();
      
      // Container should exist
      const container = state.nodes.get(result.containerId);
      expect(container).toBeDefined();
      expect(container?.type).toBe('branch');
      
      if (container?.type === 'branch') {
        expect(container.splitType).toBe('vertical');
        expect(container.first).toBe(rootId);
        expect(container.second).toBe(result.newPaneId);
      }
      
      // New pane should exist
      const newPane = state.nodes.get(result.newPaneId);
      expect(newPane?.type).toBe('leaf');
      
      // Root should now be the container
      expect(state.rootId).toBe(result.containerId);
    });

    test('splits a pane horizontally', () => {
      const { createRootPane, splitPane } = usePaneStore.getState();
      const rootId = createRootPane();
      
      const result = splitPane(rootId, 'horizontal');
      
      const state = usePaneStore.getState();
      const container = state.nodes.get(result.containerId);
      
      expect(container?.type).toBe('branch');
      if (container?.type === 'branch') {
        expect(container.splitType).toBe('horizontal');
      }
    });

    test('handles nested splits correctly', () => {
      const { createRootPane, splitPane } = usePaneStore.getState();
      const rootId = createRootPane();
      
      // First split
      const first = splitPane(rootId, 'vertical');
      
      // Split the new pane again
      const second = splitPane(first.newPaneId, 'horizontal');
      
      const state = usePaneStore.getState();
      
      // Should have 5 nodes total: 2 leaf panes + 2 containers + original
      expect(state.nodes.size).toBe(5);
      
      // The first container's second should now point to second container
      const firstContainer = state.nodes.get(first.containerId);
      if (firstContainer?.type === 'branch') {
        expect(firstContainer.second).toBe(second.containerId);
      }
    });
  });

  describe('closePane', () => {
    test('closes a pane and promotes sibling', () => {
      const { createRootPane, splitPane, closePane } = usePaneStore.getState();
      const rootId = createRootPane();
      
      const { newPaneId, containerId } = splitPane(rootId, 'vertical');
      
      // Close the new pane
      closePane(newPaneId);
      
      const state = usePaneStore.getState();
      
      // Container should be gone
      expect(state.nodes.has(containerId)).toBe(false);
      
      // New pane should be gone
      expect(state.nodes.has(newPaneId)).toBe(false);
      
      // Original pane should be root again
      expect(state.rootId).toBe(rootId);
      expect(state.nodes.has(rootId)).toBe(true);
    });

    test('handles closing the last pane', () => {
      const { createRootPane, closePane } = usePaneStore.getState();
      const rootId = createRootPane();
      
      closePane(rootId);
      
      const state = usePaneStore.getState();
      
      // Should have no nodes
      expect(state.nodes.size).toBe(0);
      expect(state.rootId).toBeNull();
    });
  });

  describe('setSessionId / getSessionId', () => {
    test('sets and gets session ID', () => {
      const { createRootPane, setSessionId, getSessionId } = usePaneStore.getState();
      const paneId = createRootPane();
      
      setSessionId(paneId, 'session-123');
      
      expect(getSessionId(paneId)).toBe('session-123');
    });

    test('returns null for non-existent pane', () => {
      const { getSessionId } = usePaneStore.getState();
      expect(getSessionId('non-existent')).toBeNull();
    });
  });

  describe('getAllLeafPanes', () => {
    test('returns all leaf panes', () => {
      const { createRootPane, splitPane, getAllLeafPanes } = usePaneStore.getState();
      const rootId = createRootPane();
      
      splitPane(rootId, 'vertical');
      const result = splitPane(rootId, 'horizontal');
      
      const leaves = usePaneStore.getState().getAllLeafPanes();
      
      // Should have 3 leaf panes
      expect(leaves.length).toBe(3);
      expect(leaves.every(p => p.type === 'leaf')).toBe(true);
    });
  });

  describe('broadcastMode', () => {
    test('toggles broadcast mode', () => {
      const { toggleBroadcastMode } = usePaneStore.getState();
      
      expect(usePaneStore.getState().broadcastMode).toBe(false);
      
      toggleBroadcastMode();
      expect(usePaneStore.getState().broadcastMode).toBe(true);
      
      toggleBroadcastMode();
      expect(usePaneStore.getState().broadcastMode).toBe(false);
    });
  });

  describe('activePaneId', () => {
    test('sets active pane ID', () => {
      const { createRootPane, setActivePaneId } = usePaneStore.getState();
      const paneId = createRootPane();
      
      setActivePaneId(paneId);
      expect(usePaneStore.getState().activePaneId).toBe(paneId);
      
      setActivePaneId(null);
      expect(usePaneStore.getState().activePaneId).toBeNull();
    });
  });

  describe('findLeafPaneId', () => {
    test('finds leaf in simple tree', () => {
      const { createRootPane, findLeafPaneId } = usePaneStore.getState();
      const rootId = createRootPane();
      
      const foundId = usePaneStore.getState().findLeafPaneId(rootId);
      expect(foundId).toBe(rootId);
    });

    test('finds first leaf in split tree', () => {
      const { createRootPane, splitPane, findLeafPaneId } = usePaneStore.getState();
      const rootId = createRootPane();
      const { containerId } = splitPane(rootId, 'vertical');
      
      const foundId = usePaneStore.getState().findLeafPaneId(containerId);
      // Should find the first leaf (the original pane)
      expect(foundId).toBe(rootId);
    });
  });
});
