// Broadcast Input - Send input to all terminal panes simultaneously
// Used when broadcast mode is enabled

type BroadcastHandler = (data: string, sourcePaneId: string) => void;

class BroadcastManager {
  private handlers: Map<string, BroadcastHandler> = new Map();

  // Register a pane to receive broadcast input
  register(paneId: string, handler: BroadcastHandler) {
    this.handlers.set(paneId, handler);
  }

  // Unregister a pane
  unregister(paneId: string) {
    this.handlers.delete(paneId);
  }

  // Broadcast input to all panes except the source
  broadcast(data: string, sourcePaneId: string) {
    this.handlers.forEach((handler, paneId) => {
      if (paneId !== sourcePaneId) {
        handler(data, sourcePaneId);
      }
    });
  }
}

// Global singleton
export const broadcastManager = new BroadcastManager();
